-- Run after migrations 001–007 against a disposable database. All fixtures roll back.
begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),('10000000-0000-0000-0000-000000000003');
insert into public.clubs(id,name) values ('20000000-0000-0000-0000-000000000001','Test');
insert into public.teams(id,club_id,name) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Test');
insert into public.user_roles(user_id,club_id,role_code) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','coach'),('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','player'),('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','player');
insert into public.team_members(team_id,club_id,user_id,role_code,coach_id) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','coach',null),('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','player','10000000-0000-0000-0000-000000000001'),('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','player',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ declare affected integer; begin
 if not public.can_edit_player('10000000-0000-0000-0000-000000000002') then raise exception 'Own player denied'; end if;
 if public.can_edit_player('10000000-0000-0000-0000-000000000003') then raise exception 'Unassigned player allowed'; end if;
 update public.profiles set birth_date='2010-05-12',sporting_role='Capitán',preferred_foot='Derecho' where id='10000000-0000-0000-0000-000000000002';
 get diagnostics affected=row_count; if affected<>1 then raise exception 'Edit denied'; end if;
 update public.profiles set sporting_role='Capitán' where id='10000000-0000-0000-0000-000000000003';
 get diagnostics affected=row_count; if affected<>0 then raise exception 'Other player changed'; end if;
end $$;
select public.set_player_score('10000000-0000-0000-0000-000000000002',94);
do $$ begin
 if not exists(select 1 from public.club_player_rankings('20000000-0000-0000-0000-000000000001') where player_id='10000000-0000-0000-0000-000000000002' and oncex_score=94) then raise exception 'Ranking missing score';end if;
 if exists(select 1 from public.club_player_rankings('20000000-0000-0000-0000-000000000002')) then raise exception 'Other club leaked';end if;
 begin
  perform public.set_player_score('10000000-0000-0000-0000-000000000003',80);
  raise exception 'Unassigned player score allowed';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
 begin
  perform public.set_player_score('10000000-0000-0000-0000-000000000002',100);
  raise exception 'Self score allowed';
 exception when insufficient_privilege then null;end;
 begin
  update public.profiles set oncex_score=100 where id='10000000-0000-0000-0000-000000000002';
  raise exception 'Direct score update allowed';
 exception when insufficient_privilege then null;end;
 if (select count(*) from public.club_player_rankings('20000000-0000-0000-0000-000000000001'))<>2 then raise exception 'Player cannot read club ranking';end if;
end $$;
rollback;
