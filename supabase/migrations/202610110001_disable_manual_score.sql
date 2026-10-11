begin;
-- Scores will be derived from match performances, never assigned manually.
-- Keep existing scores and ranking reads intact until match scoring is implemented.
revoke all on function public.set_player_score(uuid,numeric) from authenticated,anon,public;
commit;
