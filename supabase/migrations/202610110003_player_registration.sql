begin;
alter table public.profiles add column jersey_number smallint check(jersey_number between 1 and 99);
grant update(jersey_number) on public.profiles to authenticated;
drop policy profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
 using(id=auth.uid() and exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role_code<>'player'))
 with check(id=auth.uid() and exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role_code<>'player'));
create or replace function private.can_manage_photo(target_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=target_user) and (
 (target_user=auth.uid() and exists(select 1 from public.user_roles where user_id=auth.uid() and role_code<>'player'))
 or private.has_permission('platform.manage') or public.can_edit_player(target_user)
 or exists(select 1 from public.user_roles ur where ur.user_id=target_user and private.has_permission('members.manage',ur.club_id))
 or exists(select 1 from public.team_members tm where tm.user_id=target_user and private.is_team_admin(tm.team_id)));
$$;
commit;
