-- READ ONLY. Export the complete result before any approved application.
with protected_expected(signature,definition_md5,owner_name,acl) as (values
  ('private.is_team_coach(uuid)','b925edb6b494222c1a9088ea1bd6dd31','postgres','{postgres=X/postgres,authenticated=X/postgres}'),
  ('private.can_manage_match_team(uuid)','efc5dfbc2378116fe5ec8d87681a0842','postgres','{postgres=X/postgres}'),
  ('public.team_jersey_available(uuid,integer,uuid)','483eef7f0731f0f9cce1f442485f8585','postgres','{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}'),
  ('public.save_match_lineup_v2(uuid,uuid,text,date,integer,uuid[],text,uuid[])','ebf06d6766797b610db99a9661201272','postgres','{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}'),
  ('public.confirm_match_statistics_v3(uuid,integer,integer,jsonb,integer,text,text,text)','e4fb6ff98b374e633677088863b05d0d','postgres','{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}'),
  ('private.oncex_points_v2(text,integer,integer,integer,integer,integer,integer,integer,boolean,integer,integer)','9a7813e192706df37c94798b1f7ba908','postgres','{postgres=X/postgres}'),
  ('private.card_inputs(text)','9f8f288a89186092c84b008a1f573883','postgres','{postgres=X/postgres}'),
  ('private.refresh_card_season(text)','32bb24ca28a52e5fd1590de523439df1','postgres','{postgres=X/postgres}'),
  ('public.player_ovr_evolution(uuid,text)','62819b3a5af4b96ed80ce461e21ace86','postgres','{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}')
), protected_checks as (
 select e.signature,
  coalesce(md5(pg_get_functiondef(p.oid))=e.definition_md5
   and pg_get_userbyid(p.proowner)=e.owner_name
   and p.proacl::text is not distinct from e.acl,false) as matches_audit,
  md5(pg_get_functiondef(p.oid)) as current_definition_md5
 from protected_expected e left join pg_proc p on p.oid=to_regprocedure(e.signature)
), existing_expected(signature,definition_md5,owner_name,acl) as (values
  ('private.can_provision(uuid,text,uuid,uuid)','25cd2b723fa8d3e71ee9239bd475b6e6','postgres','{postgres=X/postgres}'),
  ('public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[])','2e64129868f557554ec216921d0ffb1f','postgres','{postgres=X/postgres,service_role=X/postgres}')
), existing_checks as (
 select e.signature,coalesce(md5(pg_get_functiondef(p.oid))=e.definition_md5 and pg_get_userbyid(p.proowner)=e.owner_name and p.proacl::text is not distinct from e.acl,false) as matches_audit,
  pg_get_functiondef(p.oid) as definition,pg_get_userbyid(p.proowner) as owner_name,p.proacl::text as acl
 from existing_expected e left join pg_proc p on p.oid=to_regprocedure(e.signature)
)
select jsonb_pretty(jsonb_build_object(
 'stage','PRECHECK',
 'database',current_database(),'role',current_user,
 'run_as_postgres',current_user='postgres',
 'existing_functions_match',coalesce((select bool_and(matches_audit) from existing_checks),false),
 'existing_functions_backup',(select jsonb_agg(to_jsonb(c) order by c.signature) from existing_checks c),
 'protected_functions_match',coalesce((select bool_and(matches_audit) from protected_checks),false),
 'protected_functions',(select jsonb_agg(to_jsonb(c) order by c.signature) from protected_checks c),
 'new_functions_absent',not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname='team_jersey_numbers') or (n.nspname='private' and p.proname='require_starting_goalkeeper')),
 'new_policy_absent',not exists(select 1 from pg_policy where polrelid='public.teams'::regclass and polname='teams_update_assigned_coach'),
 'new_trigger_absent',not exists(select 1 from pg_trigger where tgrelid='public.team_matches'::regclass and tgname='match_requires_goalkeeper'),
 'public_function_defaults_match',exists(select 1 from pg_default_acl where defaclrole=(select oid from pg_roles where rolname='postgres') and defaclnamespace='public'::regnamespace and defaclobjtype='f' and defaclacl::text='{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}'),
 'protected_configuration', jsonb_build_object(
 'match_scoring_weights',(select jsonb_agg(to_jsonb(w) order by w.version,w.position_name) from private.match_scoring_weights w),
 'ovr_models',(select jsonb_agg(to_jsonb(m) order by m.version) from private.ovr_models m),
 'ovr_category_mapping',(select jsonb_agg(to_jsonb(c) order by c.team_category) from private.ovr_category_mapping c),
 'photo_processing_settings',(select jsonb_agg(to_jsonb(s) order by s.id) from public.photo_processing_settings s),
 'roles',(select jsonb_agg(to_jsonb(r) order by r.code) from public.roles r),
 'permissions',(select jsonb_agg(to_jsonb(p) order by p.code) from public.permissions p),
 'role_permissions',(select jsonb_agg(to_jsonb(r) order by r.role_code,r.permission_code) from public.role_permissions r),
 'oncex_jobs',(select jsonb_agg(jsonb_build_object('jobname',j.jobname,'schedule',j.schedule,'command',j.command,'active',j.active,'database',j.database,'username',j.username) order by j.jobname) from cron.job j where j.jobname in ('oncex-team-plan-renewals','oncex-card-daily','oncex-ovr-monthly-snapshots'))
),
 'history_still_empty',not exists(select 1 from supabase_migrations.schema_migrations),
 'history_versions',(select coalesce(jsonb_agg(version order by version),'[]'::jsonb) from supabase_migrations.schema_migrations)
)) as oncex_three_deltas_precheck;
