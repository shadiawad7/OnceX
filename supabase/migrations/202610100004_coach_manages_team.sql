begin;
-- Teams are containers, created directly by club administrators using existing RLS.
-- Coaches manage the names/categories of their assigned teams.
create policy teams_update_assigned_coach on public.teams for update to authenticated
 using(private.is_team_coach(id))
 with check(private.is_team_coach(id) and exists(select 1 from public.team_members tm
  where tm.team_id=teams.id and tm.club_id=teams.club_id and tm.user_id=(select auth.uid()) and tm.role_code='coach'));
commit;
