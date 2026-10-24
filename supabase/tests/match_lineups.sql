-- Fixtures roll back; execute against a disposable local database.
begin;
insert into auth.users(id) select ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,15) i;
update public.profiles set full_name='Jugador '||right(id::text,2),position=case when right(id::text,12)::integer=1 then 'Portero' when right(id::text,12)::integer<=5 then 'Defensa' when right(id::text,12)::integer<=8 then 'Centrocampista' else 'Delantero' end;
insert into public.clubs(id,name) values('20000000-0000-0000-0000-000000000001','Lineup test');
insert into public.teams(id,club_id,name) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Own'),('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Other');
insert into public.user_roles(user_id,club_id,role_code) select id,'20000000-0000-0000-0000-000000000001',case when right(id::text,12)::integer in(13,14) then 'coach' else 'player' end from public.profiles;
insert into public.team_members(team_id,club_id,user_id,role_code) select case when right(id::text,12)::integer in(14,15) then '30000000-0000-0000-0000-000000000002'::uuid else '30000000-0000-0000-0000-000000000001'::uuid end,'20000000-0000-0000-0000-000000000001',id,case when right(id::text,12)::integer in(13,14) then 'coach' else 'player' end from public.profiles;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000013',true);
do $$ declare starters uuid[]; saved uuid; begin
 select array_agg(('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid order by i) into starters from generate_series(1,11) i;
 begin perform public.save_match_lineup('30000000-0000-0000-0000-000000000001',null,'Rival',current_date,90,starters[1:10]);raise exception '10 starters accepted';exception when invalid_parameter_value then null;end;
 begin perform public.save_match_lineup('30000000-0000-0000-0000-000000000001',null,'Rival',current_date,90,starters[1:10]||starters[1]);raise exception 'Duplicate starter accepted';exception when invalid_parameter_value then null;end;
 begin perform public.save_match_lineup('30000000-0000-0000-0000-000000000001',null,'Rival',current_date,90,starters[1:10]||'10000000-0000-0000-0000-000000000015'::uuid);raise exception 'Foreign player accepted';exception when invalid_parameter_value then null;end;
 begin perform public.save_match_lineup('30000000-0000-0000-0000-000000000002',null,'Rival',current_date,90,starters);raise exception 'Foreign team allowed';exception when insufficient_privilege then null;end;
 saved:=public.save_match_lineup('30000000-0000-0000-0000-000000000001',null,'Rival',current_date,90,starters,array['10000000-0000-0000-0000-000000000012'::uuid]);
 perform set_config('oncex.test_match',saved::text,true);
end $$;
reset role;
-- Artificial invalid draft: only the DB owner can bypass the lineup RPC.
insert into public.team_matches(id,team_id,opponent,played_on,duration) values('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','Invalid draft',current_date,90);
insert into public.match_players(match_id,player_id,player_name,player_position,starter) select '40000000-0000-0000-0000-000000000002',player_id,player_name,player_position,true from public.match_players where match_id=current_setting('oncex.test_match')::uuid and starter order by player_id limit 10;
set local role authenticated;
do $$ declare summary jsonb; performance jsonb;begin
 begin perform public.confirm_match_statistics('40000000-0000-0000-0000-000000000002',0,0,'[]');raise exception 'Incomplete XI finalized';exception when invalid_parameter_value then null;end;
 summary:=public.match_summary(current_setting('oncex.test_match')::uuid);
 begin perform public.confirm_match_statistics(current_setting('oncex.test_match')::uuid,2,0,'[]');raise exception 'Empty performances accepted';exception when invalid_parameter_value then null;end;
 select jsonb_agg(jsonb_build_object('slot_id',p->>'slot_id','minutes',case when right(p->>'player_id',12)::integer=2 then 59 when right(p->>'player_id',12)::integer=4 then 60 when right(p->>'player_id',12)::integer=12 then 31 else 90 end,'goals',case when right(p->>'player_id',12)::integer in(3,9) then 1 else 0 end,'assists',case when right(p->>'player_id',12)::integer=6 then 1 else 0 end,'yellow_cards',case when right(p->>'player_id',12)::integer=3 then 1 else 0 end)) into performance from jsonb_array_elements(summary->'players') p;
 perform public.confirm_match_statistics(current_setting('oncex.test_match')::uuid,2,0,performance);
 begin perform public.confirm_match_statistics(current_setting('oncex.test_match')::uuid,2,0,performance);raise exception 'Confirmed twice';exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ declare totals jsonb; summary jsonb;begin
 totals:=public.player_match_totals(auth.uid());
 if (totals->>'Partidos')::integer<>1 or (totals->>'Minutos')::integer<>90 or (totals->>'Clean Sheets')::integer<>1 then raise exception 'Quiet starter missing appearance/minutes/clean sheet';end if;
 summary:=public.match_summary(current_setting('oncex.test_match')::uuid);
 if jsonb_array_length(summary->'players')<>12 then raise exception 'Summary missed participants';end if;
 begin perform public.save_match_lineup('30000000-0000-0000-0000-000000000001',null,'Rival',current_date,90,'{}');raise exception 'Player registered match';exception when insufficient_privilege then null;end;
 begin perform public.confirm_match_statistics('40000000-0000-0000-0000-000000000002',0,0,'[]');raise exception 'Player finalized match';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000015',true);
do $$ begin
 begin perform public.match_summary(current_setting('oncex.test_match')::uuid);raise exception 'Foreign team summary leaked';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if (select oncex_score from public.profiles where id='10000000-0000-0000-0000-000000000001')<>5.90 then raise exception 'Goalkeeper score wrong';end if;
 if (select oncex_score from public.profiles where id='10000000-0000-0000-0000-000000000002')<>1.59 then raise exception '59-minute defender received clean sheet';end if;
 if (select oncex_score from public.profiles where id='10000000-0000-0000-0000-000000000004')<>5.60 then raise exception '60-minute defender missed clean sheet';end if;
 if (select oncex_score from public.profiles where id='10000000-0000-0000-0000-000000000006')<>5.90 then raise exception 'Midfielder score wrong';end if;
 if (select oncex_score from public.profiles where id='10000000-0000-0000-0000-000000000009')<>5.90 then raise exception 'Forward score wrong';end if;
 if private.oncex_match_points('Portero',90,2,1,1,1,1,true)<>17.90 or private.oncex_match_points('Defensa',90,2,1,1,1,1,true)<>13.90 or private.oncex_match_points('Centrocampista',90,2,1,1,1,1,true)<>8.90 or private.oncex_match_points('Delantero',90,2,1,1,1,1,true)<>4.90 then raise exception 'Position matrix wrong';end if;
 if private.oncex_match_points('Defensa',1,0,1,0,1,1,false)<>-5.99 then raise exception 'Negative points clamped';end if;
end $$;
-- Cascading history deletion must not leave a stale cached score.
delete from public.team_matches where id=current_setting('oncex.test_match')::uuid;
do $$ begin
 if (select oncex_score from public.profiles where id='10000000-0000-0000-0000-000000000001')<>0 then raise exception 'Deleted match points remain cached';end if;
end $$;
rollback;
