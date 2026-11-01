-- Disposable local database only. All fixtures roll back.
-- Disposable local database only, after all migrations. Rolls back every fixture.
begin;
insert into auth.users(id,email) values
 ('11000000-0000-0000-0000-000000000001','ai-coach@example.test'),
 ('11000000-0000-0000-0000-000000000002','ai-player@example.test'),
 ('11000000-0000-0000-0000-000000000003','ai-other-coach@example.test');
insert into auth.users(id,email) select ('11000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'ai-player-'||i||'@example.test' from generate_series(4,13) i;
update public.profiles set full_name='AI test player' where id='11000000-0000-0000-0000-000000000002';
update public.profiles set position=case when id='11000000-0000-0000-0000-000000000002' then 'Portero' else 'Delantero' end where id::text like '11000000-0000-0000-0000-%';
insert into public.clubs(id,name) values('22000000-0000-0000-0000-000000000001','AI draft test');
insert into public.teams(id,club_id,name) values
 ('33000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','AI team'),
 ('33000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000001','Other team');
insert into public.user_roles(user_id,club_id,role_code) values
 ('11000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','coach'),
 ('11000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000001','player'),
 ('11000000-0000-0000-0000-000000000003','22000000-0000-0000-0000-000000000001','coach');
insert into public.user_roles(user_id,club_id,role_code) select ('11000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'22000000-0000-0000-0000-000000000001','player' from generate_series(4,13) i;
insert into public.team_members(team_id,club_id,user_id,role_code) values
 ('33000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','coach'),
 ('33000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','player'),
 ('33000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000003','coach');
insert into public.team_members(team_id,club_id,user_id,role_code) select '33000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001',('11000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'player' from generate_series(4,13) i;

insert into auth.users(id,email) values('11000000-0000-0000-0000-000000000014','threshold-sub@example.test');
update public.profiles set position='Delantero' where id='11000000-0000-0000-0000-000000000014';
insert into public.user_roles(user_id,club_id,role_code) values('11000000-0000-0000-0000-000000000014','22000000-0000-0000-0000-000000000001','player');
insert into public.team_members(team_id,club_id,user_id,role_code) values('33000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000014','player');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
do $$ declare ids uuid[]; match_id uuid; stats jsonb; keeper jsonb; played integer; expected_clean boolean; variant integer;begin
 if public.match_clean_sheet_minimum()<>60 then raise exception 'Wrong threshold';end if;
 select array_agg(('11000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid order by i) into ids from generate_series(2,13) i where i<>3;
 for variant in 1..3 loop
  played:=case when variant=1 then 59 else 60 end;
  match_id:=public.save_match_lineup_v2('33000000-0000-0000-0000-000000000001',null,'Threshold test','2026-11-01',90,ids,'home',array['11000000-0000-0000-0000-000000000014'::uuid]);
  select jsonb_agg(jsonb_build_object('slot_id',p->>'slot_id','minutes',case when p->>'player_id'='11000000-0000-0000-0000-000000000002' then played when p->>'player_id'='11000000-0000-0000-0000-000000000014' then 90-played else 90 end,'goals',0,'own_goals',0,'assists',0,'yellow_cards',0,'red_cards',0,'conceded_while_playing',case when p->>'player_id'='11000000-0000-0000-0000-000000000002' then case when variant=3 then 1 else 0 end else 1 end)) into stats from jsonb_array_elements(public.match_summary(match_id)->'players') p;
  perform public.confirm_match_statistics_v3(match_id,0,1,stats,0,'2026/2027','home');
  select p into keeper from jsonb_array_elements(public.match_summary(match_id)->'players') p where p->>'player_id'='11000000-0000-0000-0000-000000000002';
  expected_clean:=played=60 and variant<>3;
  if (keeper->>'clean_sheet')::boolean is distinct from expected_clean then raise exception 'Wrong clean sheet at % minutes',played;end if;
  if (keeper->>'oncex_points')::numeric is distinct from (case when played=60 then case when variant=3 then 2 else 6 end else 0 end)::numeric then raise exception 'Wrong official points at % minutes: %',played,keeper;end if;
 end loop;
end $$;
rollback;
