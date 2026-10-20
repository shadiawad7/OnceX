-- Run after hierarchy migrations 001–004, team_plans and scheduled_team_plans.
begin;
insert into auth.users(id) values('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
insert into public.clubs(id,name) values('20000000-0000-0000-0000-000000000001','Plan period test');
insert into public.teams(id,club_id,name) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Own team'),('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Other team');
insert into public.user_roles(user_id,club_id,role_code) values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','coach'),('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','player');
insert into public.team_members(team_id,club_id,user_id,role_code) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','coach'),('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','player');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ declare t jsonb; begin
 t:=public.get_team_plan('30000000-0000-0000-0000-000000000001');
 begin perform public.schedule_team_plan('30000000-0000-0000-0000-000000000002','pro','basic',(t->>'period_ends_at')::timestamptz,true);raise exception 'Other team allowed';exception when insufficient_privilege then null;end;
 begin perform public.schedule_team_plan('30000000-0000-0000-0000-000000000001','pro','basic',(t->>'period_ends_at')::timestamptz,false);raise exception 'Unconfirmed request allowed';exception when invalid_parameter_value then null;end;
 begin update public.teams set plan_code='pro' where id='30000000-0000-0000-0000-000000000001';raise exception 'Immediate change allowed';exception when insufficient_privilege then null;end;
 begin update public.teams set plan_period_ends_at=now() where id='30000000-0000-0000-0000-000000000001';raise exception 'Period manipulation allowed';exception when insufficient_privilege then null;end;
 begin perform public.schedule_team_plan('30000000-0000-0000-0000-000000000001','pro','basic',now(),true);raise exception 'Stale confirmation allowed';exception when serialization_failure then null;end;
 t:=public.schedule_team_plan('30000000-0000-0000-0000-000000000001','pro','basic',(t->>'period_ends_at')::timestamptz,true);
 if t->>'current_plan'<>'basic' or t->>'pending_plan'<>'pro' then raise exception 'Plan changed before renewal';end if;
 t:=public.schedule_team_plan('30000000-0000-0000-0000-000000000001','basic','basic',(t->>'period_ends_at')::timestamptz,true);
 if t->>'pending_plan' is not null then raise exception 'Cancellation failed';end if;
 t:=public.schedule_team_plan('30000000-0000-0000-0000-000000000001','pro','basic',(t->>'period_ends_at')::timestamptz,true);
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ declare t jsonb;begin
 t:=public.get_team_plan('30000000-0000-0000-0000-000000000001');
 if public.viewer_club_plan('20000000-0000-0000-0000-000000000001')<>'basic' then raise exception 'Pending PRO leaked';end if;
 begin perform public.schedule_team_plan('30000000-0000-0000-0000-000000000001','basic','basic',(t->>'period_ends_at')::timestamptz,true);raise exception 'Player schedule allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Simulate the renewal instant without sleeping or changing the system clock.
update public.teams set plan_activated_at=now()-interval '2 months',plan_period_ends_at=now()-interval '1 day' where id='30000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$ declare t jsonb;begin
 if public.viewer_club_plan('20000000-0000-0000-0000-000000000001')<>'pro' then raise exception 'Effective PRO missing at renewal before cron';end if;
 t:=public.get_team_plan('30000000-0000-0000-0000-000000000001');
 if t->>'current_plan'<>'pro' or t->>'pending_plan' is not null or (t->>'period_ends_at')::timestamptz<=now() then raise exception 'Renewal failed';end if;
end $$;
reset role;
-- Exercise the same batch function called by the cron job for a later downgrade.
update public.teams set plan_activated_at=now()-interval '2 months',plan_period_ends_at=now()-interval '1 day',pending_plan_code='basic' where id='30000000-0000-0000-0000-000000000001';
select private.apply_due_team_plans();
do $$ begin
 if (select plan_code from public.teams where id='30000000-0000-0000-0000-000000000001')<>'basic' then raise exception 'Background downgrade failed';end if;
 if private.next_team_plan_period('2026-01-31 12:00+00','2026-02-28 12:00+00')<>'2026-03-31 12:00+00'::timestamptz then raise exception 'Monthly anniversary drift';end if;
end $$;
rollback;
