-- Apply all migrations. Fixtures roll back.
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


do $$ begin
 begin
  update public.teams set plan_code='pro' where id='30000000-0000-0000-0000-000000000001';raise exception 'Coach changed plan';
 exception when insufficient_privilege then null;end;
 update public.teams set name='Coach sporting edit' where id='30000000-0000-0000-0000-000000000001';
 if not found then raise exception 'Coach edit denied';end if;
end $$;
reset role;
insert into auth.users(id) values('10000000-0000-0000-0000-000000000004');
insert into public.user_roles(user_id,role_code) values('10000000-0000-0000-0000-000000000004','super_admin');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
update public.teams set plan_code='pro' where id='30000000-0000-0000-0000-000000000001';
do $$ begin
 if (select plan_code from public.teams where id='30000000-0000-0000-0000-000000000001')<>'pro' then raise exception 'Plan not saved';end if;
 begin
  update public.teams set plan_code='invalid' where id='30000000-0000-0000-0000-000000000001';raise exception 'Invalid plan allowed';
 exception when check_violation then null;end;
end $$;
rollback;
