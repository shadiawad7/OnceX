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
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
do $$ declare context jsonb; begin
 context:=public.ai_match_context('33000000-0000-0000-0000-000000000001');
 if jsonb_array_length(context->'players')<>11 then raise exception 'Wrong roster';end if;
 if context->'players'->0->>'player_id'<>'11000000-0000-0000-0000-000000000002' then raise exception 'Wrong player';end if;
 if (select count(*) from jsonb_object_keys(context->'players'->0))<>2 then raise exception 'Unnecessary profile information leaked';end if;
 begin perform public.ai_match_context('33000000-0000-0000-0000-000000000002');raise exception 'Other team accepted';exception when insufficient_privilege then null;end;
 for i in 2..30 loop perform public.ai_match_context('33000000-0000-0000-0000-000000000001');end loop;
 begin perform public.ai_match_context('33000000-0000-0000-0000-000000000001');raise exception 'Budget not enforced';exception when program_limit_exceeded then null;end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000002',true);
do $$ begin
 begin perform public.ai_match_context('33000000-0000-0000-0000-000000000001');raise exception 'Player allowed to prepare matches';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if exists(select 1 from public.team_matches where team_id='33000000-0000-0000-0000-000000000001') then raise exception 'AI context wrote a match';end if;
end $$;
-- Both entry methods submit the exact same official payload and RPC, never a second scoring path.
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
do $$ declare ids uuid[]; manual_id uuid; ai_id uuid; target uuid; performances jsonb; manual_rows jsonb; ai_rows jsonb;begin
 select array_agg(('11000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid order by i) into ids from generate_series(2,13) i where i<>3;
 manual_id:=public.save_match_lineup_v2('33000000-0000-0000-0000-000000000001',null,'Manual example','2026-10-29',90,ids,'home');
 ai_id:=public.save_match_lineup_v2('33000000-0000-0000-0000-000000000001',null,'Reviewed AI example','2026-10-29',90,ids,'home');
 foreach target in array array[manual_id,ai_id] loop
  select jsonb_agg(jsonb_build_object('slot_id',p->>'slot_id','minutes',90,'goals',case when p->>'player_id'='11000000-0000-0000-0000-000000000002' then 1 else 0 end,'own_goals',0,'assists',0,'yellow_cards',0,'red_cards',0,'conceded_while_playing',1)) into performances from jsonb_array_elements(public.match_summary(target)->'players') p;
  perform public.confirm_match_statistics_v3(target,1,1,performances,0,'2026/2027','home');
 end loop;
 select jsonb_agg(p-'slot_id'-'match_id' order by p->>'player_id') into manual_rows from jsonb_array_elements(public.match_summary(manual_id)->'players') p;
 select jsonb_agg(p-'slot_id'-'match_id' order by p->>'player_id') into ai_rows from jsonb_array_elements(public.match_summary(ai_id)->'players') p;
 if manual_rows is distinct from ai_rows then raise exception 'Manual and reviewed AI acta produced different official results';end if;
end $$;
rollback;
