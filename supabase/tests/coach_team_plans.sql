-- Disposable database: apply migrations 001–004, team_plans, coach_team_plans.
begin;
insert into auth.users(id) values('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),('10000000-0000-0000-0000-000000000003');
insert into public.clubs(id,name) values('20000000-0000-0000-0000-000000000001','Test plan club');
insert into public.teams(id,club_id,name) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Own team'),('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Other team');
insert into public.user_roles(user_id,club_id,role_code) values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','coach'),('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','player');
insert into public.user_roles(user_id,role_code) values('10000000-0000-0000-0000-000000000003','super_admin');
insert into public.team_members(team_id,club_id,user_id,role_code) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','coach'),('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','player');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
 update public.teams set plan_code='pro' where id='30000000-0000-0000-0000-000000000001';
 if not found then raise exception 'Coach own-team upgrade denied';end if;
 update public.teams set plan_code='basic' where id='30000000-0000-0000-0000-000000000001';
 if not found then raise exception 'Coach downgrade denied';end if;
 update public.teams set plan_code='pro' where id='30000000-0000-0000-0000-000000000002';
 if found then raise exception 'Other team changed';end if;
 begin update public.teams set plan_code='invalid' where id='30000000-0000-0000-0000-000000000001';raise exception 'Invalid plan allowed';exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
 update public.teams set plan_code='pro' where id='30000000-0000-0000-0000-000000000001';
 if found then raise exception 'Player changed plan';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$ begin
 update public.teams set plan_code='pro' where id='30000000-0000-0000-0000-000000000002';
 if not found then raise exception 'Superadmin denied';end if;
end $$;
rollback;
