begin;
alter table public.profiles
 add column birth_date date check (birth_date >= date '1900-01-01' and birth_date <= current_date),
 add column sporting_role text not null default 'Jugador' check (sporting_role in ('Jugador','Capitán','Segundo capitán')),
 add column preferred_foot text not null default '' check (preferred_foot in ('','Derecho','Izquierdo','Ambos'));
grant update(birth_date,sporting_role,preferred_foot) on public.profiles to authenticated;
-- Editing privileges mirror the existing profile policies; no authentication roles are changed.
create function public.can_edit_player(target_player uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.user_roles where user_id=target_player and role_code='player') and (
 private.has_permission('platform.manage',null)
 or exists(select 1 from public.user_roles ur where ur.user_id=target_player and ur.role_code='player' and private.has_permission('members.manage',ur.club_id))
 or exists(select 1 from public.team_members tm where tm.user_id=target_player and tm.role_code='player' and (
 private.is_team_admin(tm.team_id) or (tm.coach_id=auth.uid() and private.is_team_coach(tm.team_id)))))
$$;
revoke all on function public.can_edit_player(uuid) from public,anon;
grant execute on function public.can_edit_player(uuid) to authenticated;
commit;
