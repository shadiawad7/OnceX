-- Disposable local database only, after the plan migration. Fixtures roll back.
begin;
insert into auth.users(id,email) values
 ('81000000-0000-0000-0000-000000000001','licence-player@example.test'),
 ('81000000-0000-0000-0000-000000000002','licence-coach@example.test'),
 ('81000000-0000-0000-0000-000000000003','licence-other@example.test');
insert into public.clubs(id,name) values('82000000-0000-0000-0000-000000000001','Licence club');
insert into public.teams(id,club_id,name) values('83000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','Test');
insert into public.user_roles(user_id,club_id,role_code) values
 ('81000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','player'),
 ('81000000-0000-0000-0000-000000000002','82000000-0000-0000-0000-000000000001','coach');
insert into public.team_members(user_id,team_id,club_id,role_code) values
 ('81000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','player'),
 ('81000000-0000-0000-0000-000000000002','83000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','coach');
do $$ begin
 if exists(select 1 from private.licence_periods) then raise exception 'Existing players charged automatically';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000001',true);
do $$ begin
 begin perform public.set_player_licence(auth.uid(),'83000000-0000-0000-0000-000000000001',true);raise exception 'Player changed billing';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000002',true);
select public.set_player_licence('81000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001',true);
select public.set_player_licence('81000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001',true);
select * from public.team_player_licences('83000000-0000-0000-0000-000000000001');
select public.set_player_licence('81000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001',false);
reset role;
do $$ declare l private.player_licences;begin
 select * into l from private.player_licences;
 if l.stop_at is distinct from l.current_period_end or l.stop_at<=now() then raise exception 'Baja affected current period';end if;
 if (select count(*) from private.licence_periods)<>1 then raise exception 'Duplicate billing';end if;
 if (select sum(reference_price_cents) from private.licence_periods)<>399 then raise exception 'Wrong price';end if;
 perform set_config('oncex.test_identity',l.identity_id::text,true);
end $$;
set local role authenticated;
select public.set_player_licence('81000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001',true);
reset role;
do $$ begin
 if (select count(*) from private.licence_periods)<>1 then raise exception 'Resumption duplicated period';end if;
 if exists(select 1 from private.player_licences where stop_at is not null) then raise exception 'Baja not cancelled';end if;
end $$;
-- Removing a login preserves the identity and charged period; reusing the email recovers it.
delete from auth.users where id='81000000-0000-0000-0000-000000000001';
insert into auth.users(id,email) values('81000000-0000-0000-0000-000000000004','licence-player@example.test');
insert into public.user_roles(user_id,club_id,role_code) values('81000000-0000-0000-0000-000000000004','82000000-0000-0000-0000-000000000001','player');
insert into public.team_members(user_id,team_id,club_id,role_code) values('81000000-0000-0000-0000-000000000004','83000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','player');
do $$ begin
 if not exists(select 1 from private.player_identities where id=current_setting('oncex.test_identity')::uuid and profile_id='81000000-0000-0000-0000-000000000004') then raise exception 'Permanent identity lost';end if;
 if (select count(*) from private.licence_periods)<>1 then raise exception 'Billing history lost';end if;
end $$;
-- Simulate two elapsed monthly boundaries in fixtures, then materialize renewals.
do $$ declare l uuid;begin
 select id into l from private.player_licences;
 delete from private.licence_periods where licence_id=l;
 update private.player_licences set activated_at=now()-interval '2 months',current_period_end=now()-interval '1 month',stop_at=null where id=l;
 insert into private.licence_periods(licence_id,starts_at,ends_at) values(l,now()-interval '2 months',now()-interval '1 month');
 perform private.refresh_player_licence(l);
 if (select count(*) from private.licence_periods where licence_id=l)<>3 then raise exception 'Monthly renewals missing';end if;
 perform private.refresh_player_licence(l);
 if (select count(*) from private.licence_periods where licence_id=l)<>3 then raise exception 'Renewals duplicated';end if;
 update private.player_licences set current_period_end=now()-interval '1 month',stop_at=now()-interval '1 month' where id=l;
 perform private.refresh_player_licence(l);
 if (select count(*) from private.licence_periods where licence_id=l)<>3 then raise exception 'Cancelled licence renewed';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000003',true);
do $$ begin
 begin perform public.team_player_licences('83000000-0000-0000-0000-000000000001');raise exception 'Outsider read licences';exception when insufficient_privilege then null;end;
 begin perform public.club_licence_periods('82000000-0000-0000-0000-000000000001',now()-interval '1 month',now());raise exception 'Outsider read ledger';exception when insufficient_privilege then null;end;
end $$;
rollback;
