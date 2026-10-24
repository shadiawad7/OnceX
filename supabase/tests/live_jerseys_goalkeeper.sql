-- Local fixture from unique_team_jerseys.sql must exist; all match changes roll back.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000013',true);
do $$ declare starters uuid[]; m uuid;begin
 if not 7=any(public.team_jersey_numbers('30000000-0000-0000-0000-000000000001')) then raise exception 'Occupied jersey omitted';end if;
 select array_agg(('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid) into starters from generate_series(2,12) i;
 begin perform public.save_match_lineup('30000000-0000-0000-0000-000000000001',null,'No keeper',current_date,90,starters);raise exception 'Eleven without goalkeeper accepted';exception when invalid_parameter_value then null;end;
 select array_agg(('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid) into starters from generate_series(1,11) i;
 m:=public.save_match_lineup('30000000-0000-0000-0000-000000000001',null,'With keeper',current_date,90,starters);
 perform set_config('oncex.test_keeper_match',m::text,true);
end $$;
reset role;
update public.match_players set player_position='Defensa' where match_id=current_setting('oncex.test_keeper_match')::uuid;
do $$ begin
 begin update public.team_matches set status='confirmed',goals_for=0,goals_against=0 where id=current_setting('oncex.test_keeper_match')::uuid;raise exception 'Confirmation without goalkeeper accepted';exception when invalid_parameter_value then null;end;
end $$;
update public.match_players set player_position='Portero' where match_id=current_setting('oncex.test_keeper_match')::uuid and player_id='10000000-0000-0000-0000-000000000001';
update public.team_matches set status='confirmed',goals_for=0,goals_against=0 where id=current_setting('oncex.test_keeper_match')::uuid;
rollback;
