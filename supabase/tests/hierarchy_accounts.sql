\set ON_ERROR_STOP on
begin;
-- Temporary fixtures, never persist accounts outside this transaction.
insert into auth.users(id,raw_user_meta_data)
select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'{}' from generate_series(101,112) n;
insert into public.user_roles(user_id,role_code) values('00000000-0000-0000-0000-000000000101','super_admin');
set local role service_role;
select public.provision_account('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000102','club','Club A') as club_a \gset
select public.provision_account('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000103','club','Club B') as club_b \gset
select (:'club_a'::jsonb->>'club_id') as club_a_id, (:'club_b'::jsonb->>'club_id') as club_b_id \gset
select public.provision_account('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000104','team','Team A',:'club_a_id',null,'Primera Cadet') as team_a \gset
select public.provision_account('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000105','team','Team A2',:'club_a_id',null,'Primera Cadet') as team_a2 \gset
select public.provision_account('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000106','team','Team B',:'club_b_id',null,'Primera Cadet') as team_b \gset
select (:'team_a'::jsonb->>'team_id') as team_a_id, (:'team_a2'::jsonb->>'team_id') as team_a2_id, (:'team_b'::jsonb->>'team_id') as team_b_id \gset
select public.provision_account('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000107','coach','Coach A',:'club_a_id',:'team_a_id');
select public.provision_account('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000108','coach','Coach A2',:'club_a_id',:'team_a_id');
select public.provision_account('00000000-0000-0000-0000-000000000107','00000000-0000-0000-0000-000000000109','player','Player A',:'club_a_id',:'team_a_id','','00000000-0000-0000-0000-000000000107');
-- Store fixture scope for DO blocks.
select set_config('test.club_a',:'club_a_id',true),set_config('test.club_b',:'club_b_id',true),set_config('test.team_a',:'team_a_id',true),set_config('test.team_a2',:'team_a2_id',true),set_config('test.team_b',:'team_b_id',true);
do $$ begin
 begin
  perform public.provision_account('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000110','team','Forbidden',current_setting('test.club_b')::uuid,null,'Cadete');
  raise exception 'Club admin cross scope';
 exception when insufficient_privilege then null; end;
 begin
  perform public.provision_account('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000110','coach','Forbidden',current_setting('test.club_a')::uuid,current_setting('test.team_a2')::uuid);
  raise exception 'Team admin cross team';
 exception when insufficient_privilege then null; end;
 begin
  perform public.provision_account('00000000-0000-0000-0000-000000000107','00000000-0000-0000-0000-000000000110','coach','Forbidden',current_setting('test.club_a')::uuid,current_setting('test.team_a')::uuid);
  raise exception 'Coach created coach';
 exception when insufficient_privilege then null; end;
 begin
  perform public.provision_account('00000000-0000-0000-0000-000000000107','00000000-0000-0000-0000-000000000110','player','Forbidden',current_setting('test.club_a')::uuid,current_setting('test.team_a')::uuid,'','00000000-0000-0000-0000-000000000108');
  raise exception 'Coach assigned other coach';
 exception when insufficient_privilege then null; end;
 begin
  perform public.provision_account('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000110','player','Forbidden',current_setting('test.club_a')::uuid,current_setting('test.team_a2')::uuid,'','00000000-0000-0000-0000-000000000107');
  raise exception 'Coach/team mismatch accepted';
 exception when check_violation then null; end;
end $$;
reset role;
do $$ begin
 if exists(select 1 from public.user_roles where user_id='00000000-0000-0000-0000-000000000102' and role_code='player') then raise exception 'Club has player dashboard role'; end if;
 if not exists(select 1 from public.team_members where user_id='00000000-0000-0000-0000-000000000109' and coach_id='00000000-0000-0000-0000-000000000107') then raise exception 'Missing coach association'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000104',true);
do $$ begin
 if (select count(*) from public.teams)<>1 then raise exception 'Team admin team leak'; end if;
 update public.teams set name='Updated by team administrator' where id=current_setting('test.team_a')::uuid;
 if not found then raise exception 'Team administrator cannot edit own team'; end if;
 update public.teams set name='Forbidden edit' where id=current_setting('test.team_a2')::uuid;
 if found then raise exception 'Team administrator edited another team'; end if;
 if (select count(*) from public.clubs)<>1 then raise exception 'Team admin club leak'; end if;
 if not public.can_create_account('coach',current_setting('test.club_a')::uuid,current_setting('test.team_a')::uuid) then raise exception 'Team admin capability missing'; end if;
 if public.can_create_account('coach',current_setting('test.club_a')::uuid,current_setting('test.team_a2')::uuid) then raise exception 'Team admin sibling capability'; end if;
 begin
  perform public.provision_account(auth.uid(),'00000000-0000-0000-0000-000000000110','club','Escalation');
  raise exception 'Client can invoke trusted provision';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000107',true);
do $$ begin
 update public.profiles set position='Delantero' where id='00000000-0000-0000-0000-000000000109';
 if not found then raise exception 'Coach cannot set assigned player position'; end if;
 update public.profiles set position='Forbidden' where id='00000000-0000-0000-0000-000000000103';
 if found then raise exception 'Coach edited another club profile'; end if;
 update public.teams set name='Managed by coach' where id=current_setting('test.team_a')::uuid;
 if not found then raise exception 'Coach cannot manage assigned team'; end if;
 update public.teams set name='Forbidden coach edit' where id=current_setting('test.team_a2')::uuid;
 if found then raise exception 'Coach managed another team'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000109',true);
do $$ begin
 if (select count(*) from public.teams)<>1 then raise exception 'Player team leak'; end if;
 if not exists(select 1 from public.profiles where id='00000000-0000-0000-0000-000000000107') then raise exception 'Player cannot see coach'; end if;
 if public.can_create_account('player',current_setting('test.club_a')::uuid,current_setting('test.team_a')::uuid) then raise exception 'Player can create account'; end if;
end $$;
rollback;
\echo 'ONCEX hierarchy checks passed'
