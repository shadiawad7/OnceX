-- Run on a disposable local database after migrations 001, 002, 003 and admin_hierarchy_delete.
begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),('10000000-0000-0000-0000-000000000003');
insert into public.user_roles(user_id,role_code) values('10000000-0000-0000-0000-000000000001','super_admin');
insert into public.clubs(id,name) values('20000000-0000-0000-0000-000000000001','Deletion test');
insert into public.teams(id,club_id,name) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Deletion team');
insert into public.user_roles(user_id,club_id,role_code) values('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','coach'),('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','player');
insert into public.team_members(team_id,club_id,user_id,role_code,coach_id) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','coach',null),('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','player','10000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
 begin perform public.admin_delete_hierarchy('player','10000000-0000-0000-0000-000000000003');raise exception 'Coach deletion allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
 begin perform public.admin_delete_hierarchy('coach','10000000-0000-0000-0000-000000000001');raise exception 'Self deletion allowed';exception when insufficient_privilege then null;end;
 begin perform public.admin_delete_hierarchy('club','20000000-0000-0000-0000-000000000001');raise exception 'Nonempty club deleted';exception when raise_exception then if sqlerrm<>'Elimina primero los equipos del club.' then raise;end if;end;
 begin perform public.admin_delete_hierarchy('team','30000000-0000-0000-0000-000000000001');raise exception 'Nonempty team deleted';exception when raise_exception then if sqlerrm<>'Elimina primero los entrenadores y jugadores del equipo.' then raise;end if;end;
 begin perform public.admin_delete_hierarchy('coach','10000000-0000-0000-0000-000000000002');raise exception 'Coach with players deleted';exception when raise_exception then if sqlerrm<>'Reasigna o elimina primero los jugadores de este entrenador.' then raise;end if;end;
end $$;
select public.admin_delete_hierarchy('player','10000000-0000-0000-0000-000000000003');
select public.admin_delete_hierarchy('coach','10000000-0000-0000-0000-000000000002');
select public.admin_delete_hierarchy('team','30000000-0000-0000-0000-000000000001');
select public.admin_delete_hierarchy('club','20000000-0000-0000-0000-000000000001');
reset role;
do $$ begin
 if exists(select 1 from auth.users where id in ('10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003')) then raise exception 'Auth accounts remain';end if;
 if exists(select 1 from public.profiles where id='10000000-0000-0000-0000-000000000003') then raise exception 'Player profile remains';end if;
 if exists(select 1 from public.clubs where id='20000000-0000-0000-0000-000000000001') then raise exception 'Club remains';end if;
end $$;
rollback;
