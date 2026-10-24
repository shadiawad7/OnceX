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
do $$ declare ids uuid[]; saved uuid;perf jsonb; data jsonb;begin
 select array_agg(('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid) into ids from generate_series(1,11) i;
 saved:=public.save_match_lineup_v2('30000000-0000-0000-0000-000000000001',null,'Away test',current_date,90,ids,'away',array['10000000-0000-0000-0000-000000000012'::uuid]);
 perform set_config('oncex.away_match',saved::text,true);
 select jsonb_agg(jsonb_build_object('slot_id',p->>'slot_id','minutes',case when right(p->>'player_id',12)::integer=2 then 59 when right(p->>'player_id',12)::integer=3 then 60 when right(p->>'player_id',12)::integer=12 then 0 else 90 end,'conceded_while_playing',0,'goals',case when right(p->>'player_id',12)::integer=9 then 1 else 0 end)) into perf from jsonb_array_elements(public.match_summary(saved)->'players') p;
 perform set_config('oncex.away_performance',perf::text,true);
 begin perform public.confirm_match_statistics_v3(saved,1,0,perf,0,'2026/2027',null);raise exception 'Missing venue accepted';exception when invalid_parameter_value then null;end;
 perform public.confirm_match_statistics_v3(saved,1,0,perf,0,'2026/2027','away');
 data:=public.match_summary(saved);
 if data->'match'->>'venue'<>'away' then raise exception 'Venue not stored';end if;
 if exists(select 1 from jsonb_array_elements(data->'players') p where (p->'points_breakdown'->'parts'->>'awayWin')::integer<>case when (p->>'minutes')::integer>=60 then 1 else 0 end) then raise exception 'Away win threshold mismatch';end if;
 perform set_config('oncex.away_snapshot',data::text,true);
 perform public.confirm_match_statistics_v3(saved,1,0,perf,1,'2026/2027','home','Corregir condición a local');
 data:=public.match_summary(saved);
 if exists(select 1 from jsonb_array_elements(data->'players') p join jsonb_array_elements(current_setting('oncex.away_snapshot')::jsonb->'players') old on old->>'slot_id'=p->>'slot_id' where (old->>'oncex_points')::numeric-(p->>'oncex_points')::numeric<>case when (p->>'minutes')::integer>=60 then 1 else 0 end) then raise exception 'Other scoring rules changed';end if;
 -- Away draw must not reward away bonus.
 select jsonb_agg(jsonb_set(p,'{goals}','0')) into perf from jsonb_array_elements(perf) p;
 perform public.confirm_match_statistics_v3(saved,0,0,perf,2,'2026/2027','away','Corregir marcador a empate');
 data:=public.match_summary(saved);
 if exists(select 1 from jsonb_array_elements(data->'players') p where (p->'points_breakdown'->'parts'->>'awayWin')::integer<>0) then raise exception 'Draw got away win bonus';end if;
 -- Away defeat must not reward away bonus either.
 select jsonb_agg(jsonb_set(p,'{conceded_while_playing}',case when (p->>'minutes')::integer>0 then '1'::jsonb else '0'::jsonb end)) into perf from jsonb_array_elements(perf) p;
 perform public.confirm_match_statistics_v3(saved,0,1,perf,3,'2026/2027','away','Corregir marcador a derrota');
 data:=public.match_summary(saved);
 if exists(select 1 from jsonb_array_elements(data->'players') p where (p->'points_breakdown'->'parts'->>'awayWin')::integer<>0) then raise exception 'Defeat got away win bonus';end if;
 if jsonb_array_length(public.match_revision_history(saved))<>4 then raise exception 'Official revision history missing';end if;
end $$;
rollback;
