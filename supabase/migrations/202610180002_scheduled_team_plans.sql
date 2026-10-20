begin;
-- Existing teams start their first tracked monthly period when this migration runs.
-- No historical payment or activation date is inferred.
alter table public.teams
 add column plan_activated_at timestamptz not null default now(),
 add column plan_period_ends_at timestamptz not null default (now()+interval '1 month'),
 add column pending_plan_code text check(pending_plan_code in ('basic','pro')),
 add column plan_change_requested_at timestamptz,
 add constraint team_plan_period_valid check(plan_period_ends_at>plan_activated_at);

create function private.next_team_plan_period(anchor timestamptz, at_time timestamptz) returns timestamptz
language plpgsql immutable set search_path='' set timezone='UTC' as $$
declare months integer; result timestamptz;
begin
 months:=greatest(1,(extract(year from at_time)::integer-extract(year from anchor)::integer)*12+extract(month from at_time)::integer-extract(month from anchor)::integer+1);
 while months>1 and anchor+((months-1)*interval '1 month')>at_time loop months:=months-1;end loop;
 result:=anchor+(months*interval '1 month');
 while result<=at_time loop months:=months+1;result:=anchor+(months*interval '1 month');end loop;
 return result;
end;
$$;

-- Billing fields are written only by checked definer functions or the DB owner.
-- Changing name/category through normal team RLS remains supported.
create or replace function private.check_team_plan() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if row(new.plan_code,new.plan_activated_at,new.plan_period_ends_at,new.pending_plan_code,new.plan_change_requested_at)
   is distinct from row(old.plan_code,old.plan_activated_at,old.plan_period_ends_at,old.pending_plan_code,old.plan_change_requested_at)
   and current_user <> pg_catalog.pg_get_userbyid((select relowner from pg_catalog.pg_class where oid='public.teams'::regclass)) then
    raise exception 'Programa el cambio desde la pestaña Plan y confirma sus condiciones.' using errcode='42501';
  end if;
 elsif new.plan_code<>'basic' and current_user <> pg_catalog.pg_get_userbyid((select relowner from pg_catalog.pg_class where oid='public.teams'::regclass)) and not private.has_permission('members.manage',new.club_id) then
  raise exception 'No puedes asignar el plan inicial.' using errcode='42501';
 end if;
 return new;
end;
$$;

create function private.renew_team_plan(target_team uuid) returns void
language plpgsql security definer set search_path='' as $$
declare t public.teams;
begin
 select * into t from public.teams where id=target_team for update;
 if not found or t.plan_period_ends_at>now() then return;end if;
 if t.pending_plan_code is not null then
  update public.teams set plan_code=t.pending_plan_code,plan_activated_at=t.plan_period_ends_at,
   plan_period_ends_at=private.next_team_plan_period(t.plan_period_ends_at,now()),pending_plan_code=null,plan_change_requested_at=null where id=t.id;
 else
  update public.teams set plan_period_ends_at=private.next_team_plan_period(t.plan_activated_at,now()) where id=t.id;
 end if;
end;
$$;

create function public.get_team_plan(target_team uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.teams;
begin
 select * into t from public.teams where id=target_team;
 if not found or not (private.has_permission('members.manage',t.club_id) or private.is_team_admin(t.id) or exists(select 1 from public.team_members where team_id=t.id and user_id=auth.uid())) then raise exception 'No puedes consultar este equipo.' using errcode='42501';end if;
 perform private.renew_team_plan(target_team);
 select * into t from public.teams where id=target_team;
 return jsonb_build_object('current_plan',t.plan_code,'pending_plan',t.pending_plan_code,'period_ends_at',t.plan_period_ends_at,'activated_at',t.plan_activated_at);
end;
$$;

create function public.schedule_team_plan(target_team uuid,new_plan text,expected_plan text,expected_period_end timestamptz,confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.teams;
begin
 if confirmed is distinct from true then raise exception 'Debes confirmar el cambio de plan.' using errcode='22023';end if;
 if new_plan is null or new_plan not in ('basic','pro') then raise exception 'Plan no válido.' using errcode='22023';end if;
 select * into t from public.teams where id=target_team for update;
 if not found or not (private.has_permission('members.manage',t.club_id) or private.is_team_coach(t.id)) then
  raise exception 'Solo los administradores o entrenadores asignados al equipo pueden cambiar su plan.' using errcode='42501';
 end if;
 if t.plan_code is distinct from expected_plan or t.plan_period_ends_at is distinct from expected_period_end or t.plan_period_ends_at<=now() then
  raise exception 'El periodo o el plan han cambiado. Recarga el plan y vuelve a confirmarlo.' using errcode='40001';
 end if;
 update public.teams set pending_plan_code=case when new_plan=plan_code then null else new_plan end,
  plan_change_requested_at=case when new_plan=plan_code then null else now() end where id=target_team;
 return public.get_team_plan(target_team);
end;
$$;

create function private.apply_due_team_plans() returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 for target in select id from public.teams where plan_period_ends_at<=now() for update skip locked loop
  perform private.renew_team_plan(target);
 end loop;
end;
$$;
-- Scheduled entitlements are correct at the boundary even between cron runs.
create or replace function public.viewer_club_plan(target_club uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when private.has_permission('clubs.read',target_club) and (
 private.has_permission('platform.manage')
 or exists(select 1 from public.user_roles where user_id=auth.uid() and club_id=target_club and role_code<>'player')
 or exists(select 1 from public.team_members tm join public.teams t on t.id=tm.team_id
 where tm.user_id=auth.uid() and tm.role_code='player' and t.club_id=target_club
 and (case when t.plan_period_ends_at<=now() and t.pending_plan_code is not null then t.pending_plan_code else t.plan_code end)='pro'))
 then 'pro' else 'basic' end;
$$;
revoke all on function private.next_team_plan_period(timestamptz,timestamptz),private.renew_team_plan(uuid),private.apply_due_team_plans() from public,anon,authenticated;
revoke all on function public.get_team_plan(uuid),public.schedule_team_plan(uuid,text,text,timestamptz,boolean) from public,anon;
grant execute on function public.get_team_plan(uuid),public.schedule_team_plan(uuid,text,text,timestamptz,boolean) to authenticated;
commit;
