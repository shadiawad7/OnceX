-- Disposable local database only. No remote production fixtures.
begin;
insert into auth.users(id,email) select ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'v2-player-'||i||'@example.test' from generate_series(1,15) i;
update public.profiles set full_name='Jugador '||right(id::text,2),position=case when right(id::text,12)::integer=1 then 'Portero' when right(id::text,12)::integer<=5 then 'Defensa' when right(id::text,12)::integer<=8 then 'Centrocampista' else 'Delantero' end;
insert into public.clubs(id,name) values('20000000-0000-0000-0000-000000000001','Lineup test');
insert into public.teams(id,club_id,name) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Own'),('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Other');
insert into public.user_roles(user_id,club_id,role_code) select id,'20000000-0000-0000-0000-000000000001',case when right(id::text,12)::integer in(13,14) then 'coach' else 'player' end from public.profiles;
insert into public.team_members(team_id,club_id,user_id,role_code) select case when right(id::text,12)::integer in(14,15) then '30000000-0000-0000-0000-000000000002'::uuid else '30000000-0000-0000-0000-000000000001'::uuid end,'20000000-0000-0000-0000-000000000001',id,case when right(id::text,12)::integer in(13,14) then 'coach' else 'player' end from public.profiles;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000013',true);
do $$ declare ids uuid[]; saved uuid; perf jsonb;bad jsonb;begin
 select array_agg(('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid) into ids from generate_series(1,11) i;
 saved:=public.save_match_lineup('30000000-0000-0000-0000-000000000001',null,'Result consistency',current_date,90,ids);
 select jsonb_agg(jsonb_build_object('slot_id',p->>'slot_id','minutes',90,'conceded_while_playing',1,'goals',case when right(p->>'player_id',12)::integer in(9,10) then 1 else 0 end,'assists',case when right(p->>'player_id',12)::integer=9 then 1 else 0 end)) into perf from jsonb_array_elements(public.match_summary(saved)->'players') p;
 begin perform public.confirm_match_statistics_v2(saved,1,1,perf,0,'2026/2027');raise exception 'More goals than result accepted';exception when invalid_parameter_value then null;end;
 begin perform public.confirm_match_statistics_v2(saved,3,1,perf,0,'2026/2027');raise exception 'Fewer goals than result accepted';exception when invalid_parameter_value then null;end;
 select jsonb_agg(case when e->>'assists'='1' then jsonb_set(e,'{assists}','3') else e end) into bad from jsonb_array_elements(perf) e;
 begin perform public.confirm_match_statistics_v2(saved,2,1,bad,0,'2026/2027');raise exception 'Excess assists accepted';exception when invalid_parameter_value then null;end;
 select jsonb_agg(case when e->>'assists'='1' then jsonb_set(e,'{goals}','2') when e->>'goals'='1' then jsonb_set(e,'{goals}','0') else e end) into bad from jsonb_array_elements(perf) e;
 begin perform public.confirm_match_statistics_v2(saved,2,1,bad,0,'2026/2027');raise exception 'Self assist accepted';exception when invalid_parameter_value then null;end;
 perform public.confirm_match_statistics_v2(saved,2,1,perf,0,'2026/2027');
 if jsonb_array_length(public.match_revision_history(saved))<>1 then raise exception 'Rejected validations changed official data';end if;
end $$;
rollback;
