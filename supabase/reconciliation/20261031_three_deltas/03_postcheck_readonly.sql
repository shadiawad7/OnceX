-- READ ONLY. Every *_match/*_unchanged/permissions/owner_only check must be true.
-- Compare protected_configuration and history_versions with 01, ignoring no fields.
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
), target_expected(signature,source_md5) as (values
  ('private.can_provision(uuid,text,uuid,uuid)','1e7e8c5ce56b7d2f5b78cd858a61774e'),
  ('public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[])','171a76538f134b88a92a2073cbed9468'),
  ('public.team_jersey_numbers(uuid,uuid)','8c352946731f6445085f693d8d2ee432'),
  ('private.require_starting_goalkeeper()','38b4b330133eb4d14630ee3e0221aadc')
), target_checks as (
 select e.signature,coalesce(md5(p.prosrc)=e.source_md5 and pg_get_userbyid(p.proowner)='postgres'
   and p.prokind='f' and p.prosecdef and not p.proisstrict and not p.proleakproof
   and p.proparallel='u' and not p.proretset
   and p.provolatile=case when e.signature in ('private.can_provision(uuid,text,uuid,uuid)','public.team_jersey_numbers(uuid,uuid)') then 's'::"char" else 'v'::"char" end
   and (select lanname from pg_language where oid=p.prolang)=case when e.signature='private.can_provision(uuid,text,uuid,uuid)' then 'sql' else 'plpgsql' end
   and p.pronargdefaults=case when e.signature in ('public.team_jersey_numbers(uuid,uuid)','public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[])') then 1 else 0 end
   and p.prorettype=to_regtype(case e.signature
     when 'private.can_provision(uuid,text,uuid,uuid)' then 'boolean'
     when 'public.team_jersey_numbers(uuid,uuid)' then 'integer[]'
     when 'private.require_starting_goalkeeper()' then 'trigger' else 'uuid' end)
   and p.proargnames is not distinct from case e.signature
     when 'private.can_provision(uuid,text,uuid,uuid)' then array['actor','kind','target_club','target_team']::text[]
     when 'public.team_jersey_numbers(uuid,uuid)' then array['target_team','excluded_player']::text[]
     when 'public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[])' then array['target_team','target_match','opponent_name','match_date','match_duration','starter_ids','substitute_ids']::text[]
     else null::text[] end
   and coalesce(cardinality(p.proconfig),0)=1
   and exists(select 1 from unnest(p.proconfig) s(value) where split_part(s.value,'=',1)='search_path' and btrim(split_part(s.value,'=',2),'"')=''),false) as source_matches,
  pg_get_functiondef(p.oid) as definition,p.proacl::text as acl,
  case when p.oid is null then null else has_function_privilege('authenticated',p.oid,'EXECUTE') end as authenticated_execute,
  case when p.oid is null then null else has_function_privilege('anon',p.oid,'EXECUTE') end as anon_execute,
  case when p.oid is null then null else has_function_privilege('service_role',p.oid,'EXECUTE') end as service_role_execute,
  coalesce((select bool_or(a.grantee=0 and a.privilege_type='EXECUTE') from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),false) as public_execute
 from target_expected e left join pg_proc p on p.oid=to_regprocedure(e.signature)
)
select jsonb_pretty(jsonb_build_object(
 'stage','POSTCHECK','database',current_database(),'role',current_user,
 'target_functions_match',coalesce((select bool_and(source_matches) from target_checks),false),
 'target_functions',(select jsonb_agg(to_jsonb(c) order by c.signature) from target_checks c),
 'existing_acls_unchanged',(select p.proacl::text='{postgres=X/postgres}' from pg_proc p where p.oid=to_regprocedure('private.can_provision(uuid,text,uuid,uuid)')) and (select p.proacl::text='{postgres=X/postgres,service_role=X/postgres}' from pg_proc p where p.oid=to_regprocedure('public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[])')),
 'jersey_rpc_permissions',exists(select 1 from target_checks where signature='public.team_jersey_numbers(uuid,uuid)' and authenticated_execute and not anon_execute and not public_execute and service_role_execute),
 'goalkeeper_function_owner_only',exists(select 1 from target_checks where signature='private.require_starting_goalkeeper()' and not authenticated_execute and not anon_execute and not public_execute and not service_role_execute and acl='{postgres=X/postgres}'),
 'policy_matches',exists(select 1 from pg_policy p where p.polrelid='public.teams'::regclass and p.polname='teams_update_assigned_coach'
   and p.polcmd='w' and p.polpermissive
   and p.polroles=array[(select oid from pg_roles where rolname='authenticated')]::oid[]
   and regexp_replace(pg_get_expr(p.polqual,p.polrelid),'[[:space:]]','','g')='private.is_team_coach(id)'
   and regexp_replace(pg_get_expr(p.polwithcheck,p.polrelid),'[[:space:]]','','g')='(private.is_team_coach(id)AND(EXISTS(SELECT1FROMteam_memberstmWHERE((tm.team_id=teams.id)AND(tm.club_id=teams.club_id)AND(tm.user_id=(SELECTauth.uid()ASuid))AND(tm.role_code=''coach''::text)))))'),
 'trigger_matches',exists(select 1 from pg_trigger t where t.tgrelid='public.team_matches'::regclass and t.tgname='match_requires_goalkeeper'
   and t.tgfoid=to_regprocedure('private.require_starting_goalkeeper()')
   and not t.tgisinternal and t.tgtype=19 /* ROW | BEFORE | UPDATE */
   and t.tgenabled='O' and t.tgqual is null and t.tgnargs=0 and t.tgattr=''::int2vector),
 'protected_functions_match',coalesce((select bool_and(matches_audit) from protected_checks),false),
 'protected_functions',(select jsonb_agg(to_jsonb(c) order by c.signature) from protected_checks c),
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
)) as oncex_three_deltas_postcheck;
