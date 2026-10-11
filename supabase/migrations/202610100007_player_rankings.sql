begin;
alter table public.profiles add column oncex_score numeric(5,2) check (oncex_score between 0 and 100);
-- A score remains null until a real assessment exists. No fabricated scores or formula.
-- Only sporting ranking data are shared with authenticated members of the same club.
create function public.club_player_rankings(target_club uuid)
returns table (player_id uuid, full_name text, player_position text, team_id uuid, team_name text, category text, oncex_score numeric)
language sql stable security definer set search_path = '' as $$
 select p.id,p.full_name,p.position,t.id,t.name,t.category,p.oncex_score
 from public.team_members tm join public.profiles p on p.id=tm.user_id
 join public.teams t on t.id=tm.team_id
 where tm.role_code='player' and tm.club_id=target_club
 and private.has_permission('clubs.read',target_club)
 order by p.oncex_score desc nulls last,p.full_name,p.id,t.name,t.id;
$$;
revoke all on function public.club_player_rankings(uuid) from public,anon;
grant execute on function public.club_player_rankings(uuid) to authenticated;
-- Score writes use this checked function; players have no column UPDATE grant.
create function public.set_player_score(target_player uuid, score numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.can_edit_player(target_player) then
  raise exception 'No puedes evaluar a este jugador.' using errcode='42501';
 end if;
 if score is not null and (score < 0 or score > 100 or score::text in ('NaN','Infinity','-Infinity')) then
  raise exception 'La puntuación debe estar entre 0 y 100.' using errcode='22023';
 end if;
 update public.profiles set oncex_score=score where id=target_player;
end;
$$;
revoke all on function public.set_player_score(uuid,numeric) from public,anon;
grant execute on function public.set_player_score(uuid,numeric) to authenticated;
commit;
