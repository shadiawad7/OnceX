begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.roles (
  code text primary key,
  name text not null,
  description text not null
);
create table public.permissions (
  code text primary key,
  description text not null
);
create table public.role_permissions (
  role_code text not null references public.roles(code) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (role_code, permission_code)
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_code text not null references public.roles(code),
  club_id uuid references public.clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint role_scope check (
    (role_code = 'super_admin' and club_id is null) or
    (role_code in ('club_admin', 'coach') and club_id is not null) or
    role_code = 'player'
  ),
  unique (user_id, club_id, role_code)
);
create unique index user_roles_global_unique on public.user_roles(user_id, role_code) where club_id is null;
create index user_roles_club_idx on public.user_roles(club_id, user_id);
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  category text not null default '',
  created_at timestamptz not null default now(),
  unique (id, club_id)
);
create index teams_club_idx on public.teams(club_id);
create table public.team_members (
  team_id uuid not null,
  club_id uuid not null,
  user_id uuid not null,
  role_code text not null check (role_code in ('coach', 'player')),
  primary key (team_id, user_id, role_code),
  foreign key (team_id, club_id) references public.teams(id, club_id) on delete cascade,
  foreign key (user_id, club_id, role_code) references public.user_roles(user_id, club_id, role_code) on delete cascade
);
create index team_members_user_idx on public.team_members(user_id, team_id);

insert into public.roles values
 ('super_admin', 'SUPER ADMIN', 'Gestiona toda la plataforma'),
 ('club_admin', 'CLUB ADMIN', 'Administra únicamente sus clubes'),
 ('coach', 'ENTRENADOR', 'Accede a sus equipos y jugadores'),
 ('player', 'JUGADOR', 'Consulta su perfil y sus equipos');
insert into public.permissions values
 ('platform.manage', 'Administrar todos los clubes y roles'),
 ('clubs.read', 'Consultar los clubes asignados'),
 ('teams.manage', 'Crear y modificar equipos del club'),
 ('members.manage', 'Asignar entrenadores y jugadores al club'),
 ('teams.assign', 'Asignar entrenadores y jugadores a equipos'),
 ('teams.read', 'Consultar equipos asignados'),
 ('profiles.read_own', 'Consultar el perfil propio'),
 ('profiles.update_own', 'Actualizar el nombre propio'),
 ('profiles.read_club', 'Consultar perfiles del club'),
 ('profiles.read_team', 'Consultar jugadores de los equipos entrenados');
insert into public.role_permissions select 'super_admin', code from public.permissions;
insert into public.role_permissions values
 ('club_admin','clubs.read'), ('club_admin','teams.manage'), ('club_admin','members.manage'),
 ('club_admin','teams.assign'), ('club_admin','teams.read'), ('club_admin','profiles.read_club'),
 ('club_admin','profiles.read_own'), ('club_admin','profiles.update_own'),
 ('coach','clubs.read'), ('coach','teams.read'), ('coach','profiles.read_team'),
 ('coach','profiles.read_own'), ('coach','profiles.update_own'),
 ('player','clubs.read'), ('player','teams.read'), ('player','profiles.read_own'), ('player','profiles.update_own');

-- SECURITY DEFINER avoids recursive RLS; these helpers only answer for auth.uid().
create function private.has_permission(permission text, target_club uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists (
   select 1 from public.user_roles ur
   join public.role_permissions rp on rp.role_code = ur.role_code
   where ur.user_id = (select auth.uid()) and rp.permission_code = permission
     and ((ur.role_code = 'super_admin' and ur.club_id is null)
       or (target_club is not null and ur.club_id = target_club))
 );
$$;
create function private.is_team_coach(target_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.team_members tm where tm.team_id = target_team
   and tm.user_id = (select auth.uid()) and tm.role_code = 'coach');
$$;
create function private.can_view_profile(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select target_user = (select auth.uid())
 or private.has_permission('platform.manage')
 or exists(select 1 from public.user_roles ur where ur.user_id = target_user
   and private.has_permission('profiles.read_club', ur.club_id))
 or exists(select 1 from public.team_members tm where tm.user_id = target_user
   and private.is_team_coach(tm.team_id));
$$;
revoke all on function private.has_permission(text, uuid), private.is_team_coach(uuid), private.can_view_profile(uuid) from public, anon;
grant execute on function private.has_permission(text, uuid), private.is_team_coach(uuid), private.can_view_profile(uuid) to authenticated;

create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
 -- Never trust client metadata for privileges.
 insert into public.user_roles(user_id, role_code) values (new.id, 'player');
 return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger oncex_user_created after insert on auth.users for each row execute function private.handle_new_user();
-- Include any accounts registered before this migration.
insert into public.profiles(id, full_name)
 select id, coalesce(raw_user_meta_data->>'full_name', '') from auth.users;
insert into public.user_roles(user_id, role_code) select id, 'player' from public.profiles;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.user_roles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

revoke all on public.roles, public.permissions, public.role_permissions, public.profiles,
 public.clubs, public.user_roles, public.teams, public.team_members from anon, authenticated;
grant select on public.roles, public.permissions, public.role_permissions, public.profiles,
 public.clubs, public.user_roles, public.teams, public.team_members to authenticated;
grant update(full_name) on public.profiles to authenticated;
grant insert, update, delete on public.clubs, public.teams to authenticated;
grant insert, delete on public.user_roles, public.team_members to authenticated;
grant all on public.roles, public.permissions, public.role_permissions, public.profiles,
 public.clubs, public.user_roles, public.teams, public.team_members to service_role;

create policy roles_read on public.roles for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);
create policy profiles_read on public.profiles for select to authenticated using (private.can_view_profile(id));
create policy profiles_update_own on public.profiles for update to authenticated
 using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy user_roles_read on public.user_roles for select to authenticated
 using (user_id = (select auth.uid()) or private.has_permission('platform.manage')
   or private.has_permission('members.manage', club_id));
create policy user_roles_insert on public.user_roles for insert to authenticated
 with check (private.has_permission('platform.manage')
   or (role_code in ('coach','player') and club_id is not null and private.has_permission('members.manage',club_id)));
create policy user_roles_delete on public.user_roles for delete to authenticated
 using (private.has_permission('platform.manage')
   or (role_code in ('coach','player') and club_id is not null and private.has_permission('members.manage',club_id)));
create policy clubs_read on public.clubs for select to authenticated
 using (private.has_permission('platform.manage') or private.has_permission('clubs.read',id));
create policy clubs_manage on public.clubs for all to authenticated
 using (private.has_permission('platform.manage')) with check (private.has_permission('platform.manage'));
create policy teams_read on public.teams for select to authenticated
 using (private.has_permission('teams.manage',club_id)
   or exists(select 1 from public.team_members tm where tm.team_id = id and tm.user_id = (select auth.uid())));
create policy teams_insert on public.teams for insert to authenticated with check (private.has_permission('teams.manage',club_id));
-- A team cannot be moved into a club outside the administrator's scope.
create policy teams_update on public.teams for update to authenticated
 using (private.has_permission('teams.manage',club_id)) with check (private.has_permission('teams.manage',club_id));
create policy teams_delete on public.teams for delete to authenticated using (private.has_permission('teams.manage',club_id));
create policy team_members_read on public.team_members for select to authenticated
 using (user_id = (select auth.uid()) or private.has_permission('teams.assign',club_id) or private.is_team_coach(team_id));
create policy team_members_insert on public.team_members for insert to authenticated with check (private.has_permission('teams.assign',club_id));
create policy team_members_delete on public.team_members for delete to authenticated using (private.has_permission('teams.assign',club_id));

commit;
