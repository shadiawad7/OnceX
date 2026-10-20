-- Enable pg_cron before referencing the schema it creates.
-- This job continues renewals even while the app is closed.
begin;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('oncex-team-plan-renewals','* * * * *','select private.apply_due_team_plans();');
commit;
