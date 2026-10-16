begin;
create function public.viewer_club_plan(target_club uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when private.has_permission('clubs.read',target_club) and (
 private.has_permission('platform.manage')
 or exists(select 1 from public.user_roles where user_id=auth.uid() and club_id=target_club and role_code<>'player')
 or exists(select 1 from public.team_members tm join public.teams t on t.id=tm.team_id where tm.user_id=auth.uid() and tm.role_code='player' and t.club_id=target_club and t.plan_code='pro'))
 then 'pro' else 'basic' end;
$$;
revoke all on function public.viewer_club_plan(uuid) from public,anon;
grant execute on function public.viewer_club_plan(uuid) to authenticated;
create or replace function public.club_player_rankings(target_club uuid)
returns table(player_id uuid,full_name text,player_position text,team_id uuid,team_name text,category text,oncex_score numeric,photo_path text)
language sql stable security definer set search_path='' as $$
 select p.id,p.full_name,p.position,t.id,t.name,t.category,p.oncex_score,p.photo_path
 from public.team_members tm join public.profiles p on p.id=tm.user_id join public.teams t on t.id=tm.team_id
 where tm.role_code='player' and tm.club_id=target_club and private.has_permission('clubs.read',target_club)
 and (public.viewer_club_plan(target_club)='pro' or exists(select 1 from public.team_members own where own.user_id=auth.uid() and own.team_id=tm.team_id and own.role_code='player'))
 order by p.oncex_score desc nulls last,p.full_name,p.id,t.name,t.id;
$$;
commit;
