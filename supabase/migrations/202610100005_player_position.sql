begin;
alter table public.profiles add column position text not null default '' check(length(position)<=80);
grant update(position) on public.profiles to authenticated;
-- Club operators and the assigned coach may edit their players' profile details.
create policy profiles_update_club_player on public.profiles for update to authenticated
 using(exists(select 1 from public.user_roles ur where ur.user_id=profiles.id and ur.role_code='player' and private.has_permission('members.manage',ur.club_id)))
 with check(exists(select 1 from public.user_roles ur where ur.user_id=profiles.id and ur.role_code='player' and private.has_permission('members.manage',ur.club_id)));
create policy profiles_update_coach_player on public.profiles for update to authenticated
 using(exists(select 1 from public.team_members tm where tm.user_id=profiles.id and tm.role_code='player' and tm.coach_id=(select auth.uid()) and private.is_team_coach(tm.team_id)))
 with check(exists(select 1 from public.team_members tm where tm.user_id=profiles.id and tm.role_code='player' and tm.coach_id=(select auth.uid()) and private.is_team_coach(tm.team_id)));
commit;
