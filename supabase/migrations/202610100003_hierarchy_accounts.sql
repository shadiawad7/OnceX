begin;
insert into public.roles values ('team_admin','ADMIN EQUIPO','Administra únicamente sus equipos');
insert into public.permissions values ('accounts.create','Crear cuentas dentro del ámbito asignado');
insert into public.role_permissions values
 ('super_admin','accounts.create'),('club_admin','accounts.create'),
 ('team_admin','clubs.read'),('team_admin','teams.read'),
 ('team_admin','profiles.read_own'),('team_admin','profiles.update_own'),
 ('team_admin','profiles.read_team'),('team_admin','accounts.create'),('coach','accounts.create');
alter table public.user_roles drop constraint role_scope;
alter table public.user_roles add constraint role_scope check (
 (role_code='super_admin' and club_id is null) or
 (role_code in ('club_admin','team_admin','coach') and club_id is not null) or role_code='player');
alter table public.team_members drop constraint team_members_role_code_check;
alter table public.team_members add constraint team_members_role_code_check check(role_code in ('team_admin','coach','player'));

create function private.is_team_admin(target_team uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_members where team_id=target_team and user_id=(select auth.uid()) and role_code='team_admin');
$$;
revoke all on function private.is_team_admin(uuid) from public,anon;
grant execute on function private.is_team_admin(uuid) to authenticated;
create policy teams_update_assigned_admin on public.teams for update to authenticated
 using(private.is_team_admin(id))
 with check(private.is_team_admin(id) and exists(select 1 from public.team_members tm
  where tm.team_id=teams.id and tm.club_id=teams.club_id and tm.user_id=(select auth.uid()) and tm.role_code='team_admin'));
create policy team_admin_roster_read on public.team_members for select to authenticated using(private.is_team_admin(team_id));
create policy team_admin_profiles_update on public.profiles for update to authenticated
 using(exists(select 1 from public.team_members tm where tm.user_id=id and private.is_team_admin(tm.team_id)))
 with check(exists(select 1 from public.team_members tm where tm.user_id=id and private.is_team_admin(tm.team_id)));
alter table public.team_members add column coach_id uuid references public.profiles(id) on delete set null;
create index team_members_coach_idx on public.team_members(team_id,coach_id) where role_code='player';

create function private.is_team_player(target_team uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_members where team_id=target_team and user_id=(select auth.uid()) and role_code='player');
$$;
revoke all on function private.is_team_player(uuid) from public,anon;
grant execute on function private.is_team_player(uuid) to authenticated;
create policy player_coaches_read on public.team_members for select to authenticated
 using(role_code in ('coach','team_admin') and private.is_team_player(team_id));
create or replace function private.can_view_profile(target_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select target_user=(select auth.uid()) or private.has_permission('platform.manage')
 or exists(select 1 from public.user_roles ur where ur.user_id=target_user and private.has_permission('profiles.read_club',ur.club_id))
 or exists(select 1 from public.team_members tm where tm.user_id=target_user and (
  private.is_team_coach(tm.team_id) or private.is_team_admin(tm.team_id)
  or (tm.role_code in ('coach','team_admin') and private.is_team_player(tm.team_id))));
$$;

-- Container/account creation is handled by a server function, never by client Auth signup.
-- The authenticated caller can query their own creation capability.
create function private.can_provision(actor uuid, kind text, target_club uuid, target_team uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select actor is not null and kind in ('club','team','coach','player') and (
 exists(select 1 from public.user_roles where user_id=actor and role_code='super_admin' and club_id is null)
 or (kind='team' and exists(select 1 from public.user_roles where user_id=actor and role_code='club_admin' and club_id=target_club))
 or (kind in ('coach','player') and exists(
  select 1 from public.teams t where t.id=target_team and t.club_id=target_club and (
   exists(select 1 from public.user_roles ur where ur.user_id=actor and ur.role_code='club_admin' and ur.club_id=t.club_id)
   or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.user_id=actor and (tm.role_code='team_admin' or (kind='player' and tm.role_code='coach')))
  )
 )));
$$;
revoke all on function private.can_provision(uuid,text,uuid,uuid) from public,anon,authenticated;
create function public.can_create_account(kind text, target_club uuid default null, target_team uuid default null)
returns boolean language sql stable security definer set search_path='' as $$
 select private.can_provision((select auth.uid()),kind,target_club,target_team);
$$;
revoke all on function public.can_create_account(text,uuid,uuid) from public,anon;
grant execute on function public.can_create_account(text,uuid,uuid) to authenticated;

-- Only the trusted Edge Function can call this function with an already verified actor.
-- Auth creation is external; all database relationships are committed atomically here.
create function public.provision_account(actor uuid, new_user uuid, kind text, entity_name text,
 target_club uuid default null, target_team uuid default null, team_category text default '', assigned_coach uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved_club uuid:=target_club; saved_team uuid:=target_team; assigned_role text;
begin
 if not private.can_provision(actor,kind,target_club,target_team) then
  raise insufficient_privilege using message='Account creation outside caller scope';
 end if;
 if length(trim(entity_name)) not between 1 and 120 then raise check_violation using message='Invalid name'; end if;
 -- The account must have been freshly created by this request, with only its default role.
 if not exists(select 1 from public.profiles where id=new_user)
 or exists(select 1 from public.user_roles where user_id=new_user and (role_code<>'player' or club_id is not null)) then
  raise check_violation using message='Expected a new account';
 end if;
 if kind='club' then
  insert into public.clubs(name) values(trim(entity_name)) returning id into saved_club;
  saved_team:=null; assigned_role:='club_admin';
 elsif kind='team' then
  if not exists(select 1 from public.clubs where id=target_club) or length(trim(team_category))=0 then raise check_violation using message='Invalid club or category'; end if;
  insert into public.teams(club_id,name,category) values(target_club,trim(entity_name),trim(team_category)) returning id into saved_team;
  assigned_role:='team_admin';
 else
  if not exists(select 1 from public.teams where id=target_team and club_id=target_club) then raise check_violation using message='Invalid team/club'; end if;
  if kind='player' then
   if not exists(select 1 from public.team_members where team_id=target_team and user_id=assigned_coach and role_code='coach') then
    raise check_violation using message='Select a coach of this team';
   end if;
   if exists(select 1 from public.team_members where team_id=target_team and user_id=actor and role_code='coach')
    and actor<>assigned_coach
    and not exists(select 1 from public.user_roles where user_id=actor and ((role_code='super_admin' and club_id is null) or (role_code='club_admin' and club_id=target_club)))
    and not exists(select 1 from public.team_members where team_id=target_team and user_id=actor and role_code='team_admin') then
    raise insufficient_privilege using message='Coach can only create their own players';
   end if;
  end if;
  assigned_role:=case when kind='coach' then 'coach' else 'player' end;
 end if;
 -- Record the verified operator, not the service-role identity, in audit triggers.
 perform set_config('request.jwt.claim.sub',actor::text,true);
 update public.profiles set full_name=trim(entity_name) where id=new_user;
 delete from public.user_roles where user_id=new_user and role_code='player' and club_id is null;
 insert into public.user_roles(user_id,role_code,club_id) values(new_user,assigned_role,saved_club);
 if saved_team is not null then
  insert into public.team_members(team_id,club_id,user_id,role_code,coach_id) values(saved_team,saved_club,new_user,assigned_role,case when kind='player' then assigned_coach else null end);
 end if;
 return jsonb_build_object('club_id',saved_club,'team_id',saved_team,'user_id',new_user,'role',assigned_role);
end;
$$;
revoke all on function public.provision_account(uuid,uuid,text,text,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.provision_account(uuid,uuid,text,text,uuid,uuid,text,uuid) to service_role;
commit;
