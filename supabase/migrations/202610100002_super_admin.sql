begin;

-- The Super Admin is a global role: the first migration requires club_id IS NULL.
-- Extend management to all profiles, plans and operational activity.
create policy profiles_update_platform on public.profiles for update to authenticated
 using (private.has_permission('platform.manage'))
 with check (private.has_permission('platform.manage'));

-- Expose a direct profile relationship for team rosters.
alter table public.team_members add constraint team_members_profile_fk
 foreign key(user_id) references public.profiles(id) on delete cascade;

create table public.plans (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 120),
 description text not null default '',
 monthly_price_cents integer not null default 0 check(monthly_price_cents >= 0),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.club_subscriptions (
 club_id uuid primary key references public.clubs(id) on delete cascade,
 plan_id uuid not null references public.plans(id),
 status text not null default 'active' check(status in ('trial','active','paused','ended')),
 created_at timestamptz not null default now()
);
-- An append-only operational log, without passwords, emails or profile contents.
create table public.activity_log (
 id bigint generated always as identity primary key,
 actor_id uuid references public.profiles(id) on delete set null,
 entity text not null,
 action text not null check(action in ('INSERT','UPDATE','DELETE')),
 created_at timestamptz not null default now()
);
create index activity_log_recent_idx on public.activity_log(created_at desc, id desc);
alter table public.plans enable row level security;
alter table public.club_subscriptions enable row level security;
alter table public.activity_log enable row level security;
revoke all on public.plans, public.club_subscriptions, public.activity_log from anon, authenticated;
grant select, insert, update, delete on public.plans, public.club_subscriptions to authenticated;
grant select on public.activity_log to authenticated;
grant all on public.plans, public.club_subscriptions, public.activity_log to service_role;
grant usage, select on sequence public.activity_log_id_seq to service_role;
create policy plans_manage_platform on public.plans for all to authenticated
 using (private.has_permission('platform.manage')) with check (private.has_permission('platform.manage'));
create policy subscriptions_manage_platform on public.club_subscriptions for all to authenticated
 using (private.has_permission('platform.manage')) with check (private.has_permission('platform.manage'));
create policy activity_read_platform on public.activity_log for select to authenticated
 using (private.has_permission('platform.manage'));

create function private.record_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.activity_log(actor_id,entity,action)
 values ((select auth.uid()),tg_table_name,tg_op);
 return null;
end;
$$;
revoke all on function private.record_activity() from public, anon, authenticated;
do $$
declare entity text;
begin
 foreach entity in array array['profiles','clubs','teams','user_roles','team_members','plans','club_subscriptions'] loop
  execute format('create trigger oncex_activity after insert or update or delete on public.%I for each row execute function private.record_activity()',entity);
 end loop;
end;
$$;

-- Saving a club and assigning its plan is atomic, with normal caller RLS.
create function public.admin_save_club(club_name text, target_club uuid default null, selected_plan uuid default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid;
begin
 if not private.has_permission('platform.manage') then
  raise insufficient_privilege using message = 'Global administrator required';
 end if;
 if target_club is null then
  insert into public.clubs(name) values(trim(club_name)) returning id into saved_id;
 else
  update public.clubs set name=trim(club_name) where id=target_club returning id into saved_id;
  if saved_id is null then raise exception 'Club not found'; end if;
 end if;
 if selected_plan is not null then
  insert into public.club_subscriptions(club_id,plan_id) values(saved_id,selected_plan)
  on conflict(club_id) do update set plan_id=excluded.plan_id;
 end if;
 return saved_id;
end;
$$;
revoke all on function public.admin_save_club(text,uuid,uuid) from public,anon;
grant execute on function public.admin_save_club(text,uuid,uuid) to authenticated;

insert into public.permissions(code,description) values
 ('profiles.manage','Gestionar los nombres de todas las cuentas'),
 ('plans.manage','Gestionar planes y asignaciones a todos los clubes'),
 ('activity.read','Consultar la actividad general de la plataforma');
insert into public.role_permissions(role_code,permission_code) values
 ('super_admin','profiles.manage'),('super_admin','plans.manage'),('super_admin','activity.read');

commit;
