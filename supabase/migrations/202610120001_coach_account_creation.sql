begin;
-- Coaches may create coaches and players only within teams they coach.
create or replace function private.can_provision(actor uuid, kind text, target_club uuid, target_team uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select actor is not null and kind in ('club','team','coach','player') and (
 exists(select 1 from public.user_roles where user_id=actor and role_code='super_admin' and club_id is null)
 or (kind='team' and exists(select 1 from public.user_roles where user_id=actor and role_code='club_admin' and club_id=target_club))
 or (kind in ('coach','player') and exists(
  select 1 from public.teams t where t.id=target_team and t.club_id=target_club and (
   exists(select 1 from public.user_roles ur where ur.user_id=actor and ur.role_code='club_admin' and ur.club_id=t.club_id)
   or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.user_id=actor and tm.role_code in ('team_admin','coach'))
  )
 )));
$$;
commit;
