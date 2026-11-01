-- LOCAL DISPOSABLE FIXTURE ONLY. Every test row is rolled back.
begin;
create temporary table test_context as select gen_random_uuid() coach,gen_random_uuid() club,gen_random_uuid() team,gen_random_uuid() other_team;
insert into auth.users(id,email,raw_user_meta_data) select coach,'coach@example.invalid','{"full_name":"Synthetic Coach"}' from test_context;
insert into public.clubs(id,name) select club,'Synthetic Club' from test_context;
insert into public.teams(id,club_id,name) select team,club,'Synthetic A' from test_context union all select other_team,club,'Synthetic B' from test_context;
insert into public.user_roles(user_id,role_code,club_id) select coach,'coach',club from test_context;
insert into public.team_members(team_id,club_id,user_id,role_code) select team,club,coach,'coach' from test_context;
select set_config('request.jwt.claim.sub',coach::text,true) from test_context;
create temporary table test_players as select gen_random_uuid() id,n from generate_series(1,12) n;
insert into auth.users(id,email,raw_user_meta_data) select id,'player'||n||'@example.invalid',jsonb_build_object('full_name','Synthetic Player '||n) from test_players;
update public.profiles p set position=case when n=1 then 'Portero' else 'Delantero' end,jersey_number=n from test_players t where p.id=t.id;
insert into public.user_roles(user_id,role_code,club_id) select p.id,'player',c.club from test_players p cross join test_context c;
insert into public.team_members(team_id,club_id,user_id,role_code,coach_id) select c.team,c.club,p.id,'player',c.coach from test_context c cross join test_players p;
do $$ declare c record; starters uuid[]; no_keeper uuid[]; saved uuid; rejected boolean; occupied integer[]; begin
 select * into c from test_context;
 if not private.can_provision(c.coach,'coach',c.club,c.team) or not private.can_provision(c.coach,'player',c.club,c.team) or private.can_provision(c.coach,'coach',c.club,c.other_team) then raise exception 'Provision scope failed';end if;
 select array_agg(id order by n) filter(where n<=11),array_agg(id order by n) filter(where n>=2) into starters,no_keeper from test_players;
 occupied:=public.team_jersey_numbers(c.team,null);
 if cardinality(occupied)<>12 then raise exception 'Jersey list failed';end if;
 if cardinality(public.team_jersey_numbers(c.team,starters[1]))<>11 then raise exception 'Jersey exclusion failed';end if;
 rejected:=false;begin perform public.team_jersey_numbers(c.other_team,null);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Unauthorized jersey query accepted';end if;
 rejected:=false;begin perform public.save_match_lineup_v2(c.team,null,'Synthetic opponent',current_date,90,no_keeper,'home','{}');exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Lineup without goalkeeper accepted';end if;
 saved:=public.save_match_lineup_v2(c.team,null,'Synthetic opponent',current_date,90,starters,'home','{}');
 if (select count(*) from public.match_players where match_id=saved)<>11 then raise exception 'Valid lineup failed';end if;
 update public.match_players set player_position='Delantero' where match_id=saved;
 rejected:=false;begin update public.team_matches set status='confirmed',goals_for=0,goals_against=0 where id=saved;exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Goalkeeper trigger failed';end if;
 raise notice 'PASS: provisioning scope, jersey listing/exclusion/access, v2 lineup goalkeeper validation, valid lineup, confirmation trigger';
end $$;
-- Verify the actual RLS policy under the authenticated role.
grant select on test_context to authenticated;
set local role authenticated;
do $$ declare c record; affected integer; begin
 select * into c from test_context;
 update public.teams set name='Synthetic edited' where id=c.team;get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Assigned coach update denied';end if;
 update public.teams set name='Forbidden' where id=c.other_team;get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Foreign team update allowed';end if;
 raise notice 'PASS: assigned-coach RLS update; foreign-team update blocked';
end $$;
rollback;
