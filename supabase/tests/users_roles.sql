-- Run as database owner after the migration, in an isolated test database.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001','{"full_name":"Admin","role":"super_admin"}'),
 ('00000000-0000-0000-0000-000000000002','{}'),
 ('00000000-0000-0000-0000-000000000003','{}'),
 ('00000000-0000-0000-0000-000000000004','{}'),
 ('00000000-0000-0000-0000-000000000005','{}');
do $$ begin
 if (select count(*) from public.user_roles where role_code='player') <> 5 then raise exception 'Signup must assign player'; end if;
 if exists(select 1 from public.user_roles where role_code='super_admin') then raise exception 'Metadata escalated privileges'; end if;
end $$;
insert into public.clubs(id,name) values
 ('10000000-0000-0000-0000-000000000001','Club A'),('10000000-0000-0000-0000-000000000002','Club B');
insert into public.user_roles(user_id,role_code,club_id) values
 ('00000000-0000-0000-0000-000000000001','super_admin',null),
 ('00000000-0000-0000-0000-000000000002','club_admin','10000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000003','coach','10000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000004','player','10000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000005','player','10000000-0000-0000-0000-000000000002');
insert into public.teams(id,club_id,name) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Equipo A'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Equipo B');
insert into public.team_members(team_id,club_id,user_id,role_code) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','coach'),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','player'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','player');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
do $$ begin
 if (select count(*) from public.profiles) <> 2 then raise exception 'Player profile scope (own and team coach)'; end if;
 if (select count(*) from public.teams) <> 1 then raise exception 'Player team scope'; end if;
 if (select count(*) from public.clubs) <> 1 then raise exception 'Player club leak'; end if;
 update public.profiles set full_name='Jugador' where id=auth.uid();
 begin
  insert into public.user_roles(user_id,role_code) values(auth.uid(),'super_admin');
  raise exception 'Player escalated privileges';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set id='00000000-0000-0000-0000-000000000009' where id=auth.uid();
  raise exception 'Player changed identity';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.teams(club_id,name) values('10000000-0000-0000-0000-000000000001','Unauthorized');
  raise exception 'Player created team';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
 if (select count(*) from public.profiles) <> 2 then raise exception 'Coach profile scope'; end if;
 if (select count(*) from public.team_members) <> 2 then raise exception 'Coach roster scope'; end if;
 if (select count(*) from public.teams) <> 1 then raise exception 'Coach team scope'; end if;
 begin
  insert into public.user_roles(user_id,role_code,club_id) values(auth.uid(),'club_admin','10000000-0000-0000-0000-000000000001');
  raise exception 'Coach escalated';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
 if (select count(*) from public.profiles) <> 3 then raise exception 'Club admin profile scope'; end if;
 insert into public.teams(club_id,name) values('10000000-0000-0000-0000-000000000001','Allowed');
 begin
  insert into public.teams(club_id,name) values('10000000-0000-0000-0000-000000000002','Forbidden');
  raise exception 'Cross club team write';
 exception when insufficient_privilege then null; end;
 begin
  update public.teams set club_id='10000000-0000-0000-0000-000000000002' where id='20000000-0000-0000-0000-000000000001';
  raise exception 'Cross club team move';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.user_roles(user_id,role_code,club_id) values('00000000-0000-0000-0000-000000000004','club_admin','10000000-0000-0000-0000-000000000001');
  raise exception 'Club admin assigned admin';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.team_members(team_id,club_id,user_id,role_code) values('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','player');
  raise exception 'Forged club/team accepted';
 exception when foreign_key_violation then null; end;
 insert into public.user_roles(user_id,role_code,club_id) values('00000000-0000-0000-0000-000000000005','player','10000000-0000-0000-0000-000000000001');
 insert into public.team_members(team_id,club_id,user_id,role_code) values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','player');
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 if (select count(*) from public.clubs) <> 2 then raise exception 'Super admin scope'; end if;
 insert into public.user_roles(user_id,role_code,club_id) values('00000000-0000-0000-0000-000000000005','club_admin','10000000-0000-0000-0000-000000000002');
end $$;
set local role anon;
do $$ begin
 begin
  perform * from public.profiles;
  raise exception 'Anonymous profile access';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
\echo 'ONCEX RBAC checks passed'
