-- Disposable local database only. No remote production fixtures.
begin;
insert into auth.users(id,email) select ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'v2-player-'||i||'@example.test' from generate_series(1,15) i;
update public.profiles set full_name='Jugador '||right(id::text,2),position=case when right(id::text,12)::integer=1 then 'Portero' when right(id::text,12)::integer<=5 then 'Defensa' when right(id::text,12)::integer<=8 then 'Centrocampista' else 'Delantero' end;
insert into public.clubs(id,name) values('20000000-0000-0000-0000-000000000001','Lineup test');
insert into public.teams(id,club_id,name) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Own'),('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Other');
insert into public.user_roles(user_id,club_id,role_code) select id,'20000000-0000-0000-0000-000000000001',case when right(id::text,12)::integer in(13,14) then 'coach' else 'player' end from public.profiles;
insert into public.team_members(team_id,club_id,user_id,role_code) select case when right(id::text,12)::integer in(14,15) then '30000000-0000-0000-0000-000000000002'::uuid else '30000000-0000-0000-0000-000000000001'::uuid end,'20000000-0000-0000-0000-000000000001',id,case when right(id::text,12)::integer in(13,14) then 'coach' else 'player' end from public.profiles;

-- An unrelated historical match must remain unchanged throughout the correction.
insert into public.team_matches(id,team_id,opponent,played_on,duration,goals_for,goals_against,status) values('40000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000002','Historic',current_date-7,90,0,0,'confirmed');
insert into public.match_players(match_id,player_id,player_name,player_position,starter,minutes,goals,oncex_points) values('40000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000015','Historic player','Delantero',true,90,0,19.9);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000013',true);
do $$ declare starters uuid[]; saved uuid; performance jsonb;begin
 select array_agg(('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid order by i) into starters from generate_series(1,11) i;
 saved:=public.save_match_lineup('30000000-0000-0000-0000-000000000001',null,'Rival',current_date,90,starters,array['10000000-0000-0000-0000-000000000012'::uuid]);
 perform set_config('oncex.test_match',saved::text,true);
 select jsonb_agg(jsonb_build_object('slot_id',p->>'slot_id','minutes',case when right(p->>'player_id',12)::integer=1 then 54 when right(p->>'player_id',12)::integer=9 then 80 when right(p->>'player_id',12)::integer=12 then 0 else 90 end,'conceded_while_playing',case when right(p->>'player_id',12)::integer in(1,12) then 0 else 1 end,'goals',case when right(p->>'player_id',12)::integer=9 then 2 when right(p->>'player_id',12)::integer=10 then 1 else 0 end,'assists',case when right(p->>'player_id',12)::integer=9 then 1 else 0 end)) into performance from jsonb_array_elements(public.match_summary(saved)->'players') p;
 perform set_config('oncex.test_performance',performance::text,true);
 begin perform public.confirm_match_statistics_v2(saved,3,1,'[]'::jsonb,0,'2026/2027');raise exception 'Invalid roster accepted';exception when invalid_parameter_value then null;end;
 perform public.confirm_match_statistics_v2(saved,3,1,performance,0,'2026/2027');
 begin perform public.confirm_match_statistics_v2(saved,3,1,performance,0,'2026/2027','Corrección antigua');raise exception 'Stale revision accepted';exception when serialization_failure then null;end;
 begin perform public.confirm_match_statistics_v2(saved,3,1,performance,1,'2026/2027');raise exception 'Correction without reason accepted';exception when invalid_parameter_value then null;end;
end $$;
reset role;
do $$ declare p public.match_players;begin
 select * into p from public.match_players where match_id=current_setting('oncex.test_match')::uuid and player_position='Portero';
 if not p.clean_sheet or p.oncex_points<>6 then raise exception 'Substituted keeper lost clean sheet';end if;
 select * into p from public.match_players where match_id=current_setting('oncex.test_match')::uuid and player_id='10000000-0000-0000-0000-000000000009';
 if p.oncex_points<>14 or p.points_breakdown->>'version'<>'oncex-match-v2' then raise exception 'Forward example mismatch';end if;
 if (select oncex_points from public.match_players where player_id='10000000-0000-0000-0000-000000000012')<>0 then raise exception 'Unused substitute received result points';end if;
end $$;
set local role authenticated;
do $$ declare changed jsonb;begin
 select jsonb_agg(case when e->>'goals'='2' then jsonb_set(e,'{goals}','3') else e end) into changed from jsonb_array_elements(current_setting('oncex.test_performance')::jsonb) e;
 perform public.confirm_match_statistics_v2(current_setting('oncex.test_match')::uuid,4,1,changed,1,'2026/2027','Gol revisado por el entrenador');
 if jsonb_array_length(public.match_revision_history(current_setting('oncex.test_match')::uuid))<>2 then raise exception 'Audit revisions missing';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000009',true);
do $$ begin
 if public.player_season_points(auth.uid(),'2026/2027')<>18 then raise exception 'Season points duplicated or wrong';end if;
 begin perform public.match_revision_history(current_setting('oncex.test_match')::uuid);raise exception 'Player read audit';exception when insufficient_privilege then null;end;
 begin perform public.confirm_match_statistics_v2(current_setting('oncex.test_match')::uuid,4,1,current_setting('oncex.test_performance')::jsonb,2,'2026/2027','Unauthorized change');raise exception 'Player corrected match';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if (select oncex_score from public.profiles where id='10000000-0000-0000-0000-000000000009')<>18 then raise exception 'Cached accumulated points duplicated';end if;
 if (select count(*) from private.match_revisions where match_id=current_setting('oncex.test_match')::uuid)<>2 then raise exception 'Rejected changes altered history';end if;
end $$;
do $$ begin
 if not exists(select 1 from public.match_players where match_id='40000000-0000-0000-0000-000000000009' and oncex_points=19.9 and scoring_version='oncex-match-v1' and points_breakdown is null) then raise exception 'Historical points were rewritten';end if;
end $$;
rollback;
