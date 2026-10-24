-- Review before running. Requires the earlier hierarchy, photos and scheduled-plan migrations.
-- No historical charges and no payments. Existing players start with no active licence.
begin;
-- Keep old team columns as inert compatibility data. Disable their writers and cron.
do $$ begin
 if to_regclass('cron.job') is not null then
  execute 'select cron.unschedule(jobid) from cron.job where jobname=''oncex-team-plan-renewals''';
 end if;
end $$;
revoke all on function public.schedule_team_plan(uuid,text,text,timestamptz,boolean),public.get_team_plan(uuid) from authenticated,anon,public;
create or replace function private.apply_due_team_plans() returns void language plpgsql security definer set search_path='' as $$ begin return; end; $$;
create or replace function public.viewer_club_plan(target_club uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when private.has_permission('clubs.read',target_club) then 'oncex' else null end;
$$;
drop function public.club_player_rankings(uuid);
create function public.club_player_rankings(target_club uuid)
returns table(player_id uuid,full_name text,player_position text,team_id uuid,team_name text,category text,oncex_score numeric,photo_path text)
language sql stable security definer set search_path='' as $$
 select p.id,p.full_name,p.position,t.id,t.name,t.category,p.oncex_score,p.photo_path
 from public.team_members tm join public.profiles p on p.id=tm.user_id join public.teams t on t.id=tm.team_id
 where tm.role_code='player' and tm.club_id=target_club and private.has_permission('clubs.read',target_club)
 order by p.oncex_score desc nulls last,p.full_name,p.id,t.name,t.id;
$$;

revoke all on function public.club_player_rankings(uuid) from public,anon;
grant execute on function public.club_player_rankings(uuid) to authenticated;

-- Permanent sporting identities survive removal of the login/profile.
-- Recovery email is protected from API reads; changed emails need explicit ID recovery.
create table private.player_identities (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid unique references public.profiles(id) on delete set null,
 recovery_email text unique not null,
 player_name text not null,
 created_at timestamptz not null default now()
);
create table private.player_licences (
 id uuid primary key default gen_random_uuid(),
 identity_id uuid not null references private.player_identities(id) on delete restrict,
 club_id uuid not null references public.clubs(id) on delete restrict,
 club_name text not null,
 activated_at timestamptz,
 current_period_end timestamptz,
 stop_at timestamptz,
 unique(identity_id,club_id),
 check ((activated_at is null)=(current_period_end is null)),
 check(current_period_end is null or current_period_end>activated_at)
);
create table private.licence_periods (
 id uuid primary key default gen_random_uuid(),
 licence_id uuid not null references private.player_licences(id) on delete restrict,
 starts_at timestamptz not null,
 ends_at timestamptz not null check(ends_at>starts_at),
 reference_price_cents integer not null default 399 check(reference_price_cents=399),
 club_share_cents integer not null default 40 check(club_share_cents=40),
 oncex_share_cents integer not null default 359 check(oncex_share_cents=359),
 unique(licence_id,starts_at)
);
create table private.licence_events (
 id uuid primary key default gen_random_uuid(),
 licence_id uuid not null references private.player_licences(id),
 action text not null check(action in ('activate','cancel_at_period_end','resume')),
 occurred_at timestamptz not null default now(),
 actor uuid default auth.uid()
);
revoke all on private.player_identities,private.player_licences,private.licence_periods,private.licence_events from public,anon,authenticated;
alter table private.player_identities enable row level security;
alter table private.player_licences enable row level security;
alter table private.licence_periods enable row level security;
alter table private.licence_events enable row level security;

create function private.ensure_player_identity(target_player uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare identity uuid; email_address text; player_label text;
begin
 select id into identity from private.player_identities where profile_id=target_player;
 if found then return identity;end if;
 select lower(trim(u.email)),p.full_name into email_address,player_label from auth.users u join public.profiles p on p.id=u.id where u.id=target_player;
 if email_address is null or email_address='' then raise exception 'La cuenta necesita un email para conservar su identidad.';end if;
 insert into private.player_identities(profile_id,recovery_email,player_name) values(target_player,email_address,player_label)
 on conflict(recovery_email) do update set profile_id=excluded.profile_id
 where private.player_identities.profile_id is null or private.player_identities.profile_id=excluded.profile_id
 returning id into identity;
 if identity is null then raise exception 'Esta identidad ya está vinculada a otra cuenta.';end if;
 return identity;
end;$$;
create function private.register_player_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.role_code='player' then perform private.ensure_player_identity(new.user_id);end if;return new;
end;$$;
create trigger register_permanent_player after insert or update of role_code,user_id on public.team_members for each row execute function private.register_player_identity();
do $$ declare p record;begin for p in select distinct user_id from public.team_members where role_code='player' loop perform private.ensure_player_identity(p.user_id);end loop;end $$;

-- Advances monthly periods from the activation anniversary. No duplicate period on reactivation.
create function private.refresh_player_licence(target_licence uuid) returns void
language plpgsql security definer set search_path='' as $$
declare l private.player_licences; period_start timestamptz; period_end timestamptz;
begin
 select * into l from private.player_licences where id=target_licence for update;
 if l.activated_at is null then return;end if;
 period_end:=l.current_period_end;
 while period_end<=now() and (l.stop_at is null or period_end<l.stop_at) loop
  period_start:=period_end;
  period_end:=private.next_team_plan_period(l.activated_at,period_start);
  insert into private.licence_periods(licence_id,starts_at,ends_at) values(l.id,period_start,period_end) on conflict do nothing;
 end loop;
 update private.player_licences set current_period_end=period_end where id=l.id;
end;$$;
create function private.stop_deleted_player_licences() returns trigger
language plpgsql security definer set search_path='' as $$
declare l record;
begin
 for l in select pl.id from private.player_licences pl join private.player_identities i on i.id=pl.identity_id where i.profile_id=old.id order by pl.id loop
  perform private.refresh_player_licence(l.id);
  update private.player_licences set stop_at=current_period_end where id=l.id and activated_at is not null;
  insert into private.licence_events(licence_id,action) values(l.id,'cancel_at_period_end');
 end loop;return old;
end;$$;
create trigger preserve_player_billing before delete on public.profiles for each row execute function private.stop_deleted_player_licences();

create function public.set_player_licence(target_player uuid,target_team uuid,activate boolean) returns void
language plpgsql security definer set search_path='' as $$
declare club uuid; identity uuid; l private.player_licences; action_name text;
begin
 if activate is null then raise exception 'Indica activar o dar de baja.' using errcode='22023';end if;
 select tm.club_id into club from public.team_members tm where tm.user_id=target_player and tm.team_id=target_team and tm.role_code='player';
 if club is null or not(private.has_permission('members.manage',club) or private.is_team_coach(target_team) or private.is_team_admin(target_team)) then raise exception 'No puedes gestionar esta licencia.' using errcode='42501';end if;
 identity:=private.ensure_player_identity(target_player);
 perform 1 from private.player_identities where id=identity for update;
 insert into private.player_licences(identity_id,club_id,club_name) select identity,club,name from public.clubs where id=club on conflict do nothing;
 select * into l from private.player_licences where identity_id=identity and club_id=club for update;
 perform private.refresh_player_licence(l.id);
 select * into l from private.player_licences where id=l.id;
 if activate then
  if l.activated_at is null or (l.stop_at is not null and l.stop_at<=now()) then
   update private.player_licences set activated_at=now(),current_period_end=now()+interval '1 month',stop_at=null where id=l.id;
   insert into private.licence_periods(licence_id,starts_at,ends_at) values(l.id,now(),now()+interval '1 month');
   action_name:='activate';
  elsif l.stop_at is not null then update private.player_licences set stop_at=null where id=l.id;action_name:='resume';
  else return;end if;
 else
  if l.activated_at is null or l.stop_at is not null then return;end if;
  update private.player_licences set stop_at=current_period_end where id=l.id;action_name:='cancel_at_period_end';
 end if;
 insert into private.licence_events(licence_id,action) values(l.id,action_name);
end;$$;
create function public.team_player_licences(target_team uuid) returns table(player_id uuid,identity_id uuid,full_name text,active boolean,stops_at timestamptz,period_ends_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare club uuid; l record;
begin
 select club_id into club from public.teams where id=target_team;
 if club is null or not(private.has_permission('members.manage',club) or private.is_team_coach(target_team) or private.is_team_admin(target_team)) then raise exception 'No puedes consultar estas licencias.' using errcode='42501';end if;
 for l in select pl.id from private.player_licences pl where pl.club_id=club order by pl.id loop perform private.refresh_player_licence(l.id);end loop;
 return query select p.id,i.id,p.full_name,coalesce(pl.activated_at is not null and (pl.stop_at is null or pl.stop_at>now()),false),pl.stop_at,pl.current_period_end
 from public.team_members tm join public.profiles p on p.id=tm.user_id join private.player_identities i on i.profile_id=p.id
 left join private.player_licences pl on pl.identity_id=i.id and pl.club_id=club
 where tm.team_id=target_team and tm.role_code='player' order by p.full_name,p.id;
end;$$;
-- Recovery after an email change: superadmin explicitly re-links the permanent ID.
-- A new account with no billing history can replace its temporary identity; billed identities never merge silently.
create function public.recover_player_identity(permanent_id uuid,target_player uuid) returns void
language plpgsql security definer set search_path='' as $$
declare existing_id uuid;
begin
 if not private.has_permission('platform.manage') then raise exception 'Solo el superadmin puede recuperar identidades.' using errcode='42501';end if;
 perform 1 from private.player_identities where id=permanent_id and profile_id is null for update;
 if not found then raise exception 'La identidad no existe o sigue vinculada.';end if;
 if not exists(select 1 from public.team_members where user_id=target_player and role_code='player') then raise exception 'La cuenta destino debe ser un jugador.';end if;
 select id into existing_id from private.player_identities where profile_id=target_player for update;
 if exists(select 1 from private.player_licences where identity_id=existing_id) then raise exception 'La cuenta destino ya tiene historial de licencias. Requiere revisión administrativa.';end if;
 delete from private.player_identities where id=existing_id;
 update private.player_identities set profile_id=target_player,recovery_email=(select lower(trim(email)) from auth.users where id=target_player) where id=permanent_id;
end;$$;
revoke all on function private.ensure_player_identity(uuid),private.register_player_identity(),private.refresh_player_licence(uuid),private.stop_deleted_player_licences() from public,anon,authenticated;
revoke all on function public.set_player_licence(uuid,uuid,boolean),public.team_player_licences(uuid),public.recover_player_identity(uuid,uuid) from public,anon;
grant execute on function public.set_player_licence(uuid,uuid,boolean),public.team_player_licences(uuid),public.recover_player_identity(uuid,uuid) to authenticated;
-- Read-only commercial ledger: no invoice or payment is created.
create function public.club_licence_periods(target_club uuid,range_start timestamptz,range_end timestamptz)
returns table(permanent_id uuid,player_name text,period_start timestamptz,period_end timestamptz,price_cents integer,club_share_cents integer,oncex_share_cents integer)
language plpgsql security definer set search_path='' as $$
declare l record;
begin
 if not private.has_permission('members.manage',target_club) then raise exception 'No puedes consultar la facturación de este club.' using errcode='42501';end if;
 if range_start is null or range_end is null or range_end<=range_start or range_end>range_start+interval '1 year' then raise exception 'Selecciona un intervalo válido de hasta un año.' using errcode='22023';end if;
 for l in select id from private.player_licences where club_id=target_club order by id loop perform private.refresh_player_licence(l.id);end loop;
 return query select i.id,i.player_name,p.starts_at,p.ends_at,p.reference_price_cents,p.club_share_cents,p.oncex_share_cents
 from private.licence_periods p join private.player_licences pl on pl.id=p.licence_id join private.player_identities i on i.id=pl.identity_id
 where pl.club_id=target_club and p.starts_at>=range_start and p.starts_at<range_end order by p.starts_at,i.id;
end;$$;
revoke all on function public.club_licence_periods(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.club_licence_periods(uuid,timestamptz,timestamptz) to authenticated;
commit;
