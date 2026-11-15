-- Local only. Requires the team RLS migrations and 202611140001. Fixtures roll back.
begin;
insert into auth.users(id,email) values
 ('11000000-0000-0000-0000-000000000001','federation-admin@example.test'),
 ('11000000-0000-0000-0000-000000000002','federation-coach@example.test'),
 ('11000000-0000-0000-0000-000000000003','federation-player@example.test'),
 ('11000000-0000-0000-0000-000000000004','federation-outsider@example.test');
insert into public.clubs(id,name) values('22000000-0000-0000-0000-000000000001','Federation A'),('22000000-0000-0000-0000-000000000002','Federation B');
insert into public.user_roles(user_id,club_id,role_code) values
 ('11000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','club_admin'),
 ('11000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000001','coach'),
 ('11000000-0000-0000-0000-000000000003','22000000-0000-0000-0000-000000000001','player'),
 ('11000000-0000-0000-0000-000000000004','22000000-0000-0000-0000-000000000002','coach');
insert into public.teams(id,club_id,name,category) values
 ('33000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','Existing team','Existing category'),
 ('33000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002','Foreign team','Foreign category');
insert into public.team_members(team_id,club_id,user_id,role_code) values
 ('33000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','coach'),
 ('33000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000003','player'),
 ('33000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000004','coach');
create function pg_temp.ffcv_group(season text default '2026/2027') returns jsonb language sql as $$ select jsonb_build_object(
 'source','ffcv','seasonId','22','seasonCode',season,'competitionId','905431604','competitionName','Test league','groupId','905431605','groupName','Test group','ownTeamId','1','sourceUrl','https://ffcv.es/competiciones/?cod_grupo=905431605','importedAt','2026-11-14T12:00:00Z',
 'teams',jsonb_build_array(jsonb_build_object('id','1','name','Own team','badgeUrl','https://ffcv.es/logo.png'),jsonb_build_object('id','2','name','Rival','badgeUrl','https://appwebffcv.novanet.es/logo.png'))); $$;
do $$ begin
 if (select federation_groups<>'[]'::jsonb or name<>'Existing team' or category<>'Existing category' from public.teams where id='33000000-0000-0000-0000-000000000001') then raise exception 'Existing team modified';end if;
 if (select prosecdef from pg_proc where oid='public.save_team_federation_group(uuid,jsonb,text,text)'::regprocedure) then raise exception 'RPC must be SECURITY INVOKER';end if;
 if has_function_privilege('anon','public.save_team_federation_group(uuid,jsonb,text,text)','execute') then raise exception 'Anonymous RPC exposed';end if;
 if private.valid_team_federation_groups('{}') or private.valid_team_federation_groups('null') then raise exception 'Malformed catalog accepted';end if;
 if private.valid_team_federation_groups(jsonb_build_array(jsonb_set(pg_temp.ffcv_group(),'{ownTeamId}','"9"'))) then raise exception 'Own team not in group accepted';end if;
 if private.valid_team_federation_groups(jsonb_build_array(jsonb_set(pg_temp.ffcv_group(),'{teams,0,badgeUrl}','"https://evil.example/logo"'))) then raise exception 'Unsafe badge URL accepted';end if;
 if private.valid_team_federation_groups(jsonb_build_array(jsonb_set(pg_temp.ffcv_group(),'{teams,0,id}','1'))) then raise exception 'Numeric team identifier accepted';end if;
 if private.valid_team_federation_groups(jsonb_build_array(pg_temp.ffcv_group(),pg_temp.ffcv_group())) then raise exception 'Duplicate seasons accepted';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
-- Creation is one INSERT: failure cannot leave a team without its selected catalog.
insert into public.teams(id,club_id,name,category,federation_groups) values('33000000-0000-0000-0000-000000000003','22000000-0000-0000-0000-000000000001','Created with league','Category',jsonb_build_array(pg_temp.ffcv_group()));
do $$ begin
 begin
  insert into public.teams(id,club_id,name,federation_groups) values('33000000-0000-0000-0000-000000000004','22000000-0000-0000-0000-000000000001','Invalid creation','[{}]');
  raise exception 'Invalid creation accepted';
 exception when check_violation then null;end;
 if exists(select 1 from public.teams where id='33000000-0000-0000-0000-000000000004') then raise exception 'Partial team left after rejected catalog';end if;
end $$;
select public.save_team_federation_group('33000000-0000-0000-0000-000000000001',pg_temp.ffcv_group(),'Updated name','Updated category') is not null as admin_saved;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000002',true);
do $$ begin
 if (select federation_groups->0->>'ownTeamId'<>'1' from public.teams where id='33000000-0000-0000-0000-000000000001') then raise exception 'Coach cannot see shared configuration';end if;
 perform public.save_team_federation_group('33000000-0000-0000-0000-000000000001',pg_temp.ffcv_group('2025/2026'));
 if (select jsonb_array_length(federation_groups)<>2 or name<>'Updated name' or category<>'Updated category' from public.teams where id='33000000-0000-0000-0000-000000000001') then raise exception 'Season merge or names were overwritten';end if;
 begin perform public.save_team_federation_group('33000000-0000-0000-0000-000000000001','{}','Should not save','Should not save');raise exception 'Invalid correction accepted';exception when invalid_parameter_value then null;end;
 if (select name<>'Updated name' from public.teams where id='33000000-0000-0000-0000-000000000001') then raise exception 'Invalid group partially updated team';end if;
 begin perform public.save_team_federation_group('33000000-0000-0000-0000-000000000002',pg_temp.ffcv_group());raise exception 'Foreign team changed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000003',true);
do $$ begin
 begin perform public.save_team_federation_group('33000000-0000-0000-0000-000000000001',pg_temp.ffcv_group());raise exception 'Player changed configuration';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000004',true);
do $$ begin
 if exists(select 1 from public.teams where id='33000000-0000-0000-0000-000000000001') then raise exception 'Foreign coach can read configuration';end if;
 begin perform public.save_team_federation_group('33000000-0000-0000-0000-000000000001',pg_temp.ffcv_group());raise exception 'Foreign coach changed configuration';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'team_federation_groups: PASS' as result;
