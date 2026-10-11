-- Isolated database only, as owner, after both migrations.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000011','{"full_name":"Super Admin"}'),
 ('00000000-0000-0000-0000-000000000012','{"full_name":"Club Admin"}'),
 ('00000000-0000-0000-0000-000000000013','{"full_name":"Player"}');
insert into public.clubs(id,name) values
 ('10000000-0000-0000-0000-000000000011','Club A'),('10000000-0000-0000-0000-000000000012','Club B');
insert into public.user_roles(user_id,role_code,club_id) values
 ('00000000-0000-0000-0000-000000000011','super_admin',null),
 ('00000000-0000-0000-0000-000000000012','club_admin','10000000-0000-0000-0000-000000000011'),
 ('00000000-0000-0000-0000-000000000013','player','10000000-0000-0000-0000-000000000012');
do $$ begin
 begin
  insert into public.user_roles(user_id,role_code,club_id) values('00000000-0000-0000-0000-000000000013','super_admin','10000000-0000-0000-0000-000000000012');
  raise exception 'Super admin incorrectly scoped to club';
 exception when check_violation then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
insert into public.plans(id,name,monthly_price_cents) values('30000000-0000-0000-0000-000000000011','Plan Pro',1900);
select public.admin_save_club('Club A actualizado','10000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000011');
select public.admin_save_club('Club B actualizado','10000000-0000-0000-0000-000000000012','30000000-0000-0000-0000-000000000011');
update public.profiles set full_name='Jugador actualizado' where id='00000000-0000-0000-0000-000000000013';
insert into public.teams(id,club_id,name) values
 ('20000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','Team A'),
 ('20000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000012','Team B');
insert into public.team_members(team_id,club_id,user_id,role_code) values('20000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000013','player');
do $$ begin
 if (select count(*) from public.clubs) <> 2 or (select count(*) from public.teams) <> 2 then raise exception 'Global access missing'; end if;
 if (select count(*) from public.club_subscriptions) <> 2 then raise exception 'Plan assignment scope'; end if;
 if not exists(select 1 from public.profiles where full_name='Jugador actualizado') then raise exception 'Global profile update failed'; end if;
 if not exists(select 1 from public.activity_log where actor_id=auth.uid() and entity='plans') then raise exception 'Audit actor missing'; end if;
 begin
  insert into public.activity_log(entity,action) values('clubs','INSERT');
  raise exception 'Audit forgery accepted';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.activity_log;
  raise exception 'Audit deletion accepted';
 exception when insufficient_privilege then null; end;
 begin
  perform public.admin_save_club('Should roll back',null,'30000000-0000-0000-0000-000000000099');
  raise exception 'Invalid plan accepted';
 exception when foreign_key_violation then null; end;
 if exists(select 1 from public.clubs where name='Should roll back') then raise exception 'Club/plan save not atomic'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',true);
do $$ begin
 if exists(select 1 from public.plans) or exists(select 1 from public.club_subscriptions) or exists(select 1 from public.activity_log) then raise exception 'Club admin global data leak'; end if;
 begin
  perform public.admin_save_club('Forbidden');
  raise exception 'Club admin invoked global RPC';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.plans(name) values('Forbidden');
  raise exception 'Club admin managed plans';
 exception when insufficient_privilege then null; end;
 update public.profiles set full_name='Forbidden' where id='00000000-0000-0000-0000-000000000013';
 if found then raise exception 'Club admin updated other profile'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000013',true);
do $$ begin
 if exists(select 1 from public.activity_log) or exists(select 1 from public.plans) then raise exception 'Player global data leak'; end if;
 begin
  insert into public.club_subscriptions(club_id,plan_id) values('10000000-0000-0000-0000-000000000012','30000000-0000-0000-0000-000000000011');
  raise exception 'Player assigned plan';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 begin
  perform * from public.plans;
  raise exception 'Anonymous plan read';
 exception when insufficient_privilege then null; end;
 begin
  perform public.admin_save_club('Anonymous');
  raise exception 'Anonymous RPC access';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
\echo 'ONCEX global Super Admin checks passed'
