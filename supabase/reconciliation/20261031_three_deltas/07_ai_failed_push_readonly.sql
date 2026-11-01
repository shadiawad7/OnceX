-- READ ONLY. Run in a NEW SQL Editor session as postgres; export full output.
-- No repair, push, scheduling, cleanup calls or data changes.
select jsonb_pretty(jsonb_build_object(
 'role',current_user,'database',current_database(),
 'role_attributes',(select jsonb_build_object('superuser',rolsuper,'bypass_rls',rolbypassrls) from pg_roles where rolname=current_user),
 'cron_owner',(select pg_get_userbyid(relowner) from pg_class where oid='cron.job'::regclass),
 'cron_schema_usage',has_schema_privilege(current_user,'cron','USAGE'),
 'database_connect',has_database_privilege(current_user,current_database(),'CONNECT'),
 'cron_select',has_table_privilege(current_user,'cron.job','SELECT'),
 'cron_insert',has_table_privilege(current_user,'cron.job','INSERT'),
 'cron_update',has_table_privilege(current_user,'cron.job','UPDATE'),
 'cron_delete',has_table_privilege(current_user,'cron.job','DELETE'),
 'cron_schedule_unnamed_execute',has_function_privilege(current_user,'cron.schedule(text,text)','EXECUTE'),
 'public_schema_create',has_schema_privilege(current_user,'public','CREATE'),
 'private_schema_create',has_schema_privilege(current_user,'private','CREATE'),
 'auth_users_references',has_table_privilege(current_user,'auth.users','REFERENCES'),
 'teams_references',has_table_privilege(current_user,'public.teams','REFERENCES'),
 'ai_history_absent',not exists(select 1 from supabase_migrations.schema_migrations where version='202610300001'),
 'history_versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'ai_tables_absent',to_regclass('private.ai_match_request_budgets') is null
  and to_regclass('private.ai_match_requests') is null and to_regclass('private.ai_match_cleanup_job') is null,
 'ai_functions_absent',to_regprocedure('public.ai_match_context(uuid)') is null
  and to_regprocedure('public.ai_match_request_start(uuid,text)') is null
  and to_regprocedure('public.ai_match_request_finish(uuid,integer,jsonb)') is null
  and to_regprocedure('private.cleanup_ai_match_requests()') is null,
 'ai_cleanup_jobs',(select coalesce(jsonb_agg(jsonb_build_object('jobid',jobid,'jobname',jobname,'schedule',schedule,'command',command,'database',database,'username',username,'active',active) order by jobid),'[]'::jsonb) from cron.job where jobname='oncex-ai-draft-cleanup' or command='select private.cleanup_ai_match_requests();')
)) as ai_failed_push_readonly;
