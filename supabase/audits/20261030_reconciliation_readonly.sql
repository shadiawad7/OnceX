-- Follow-up evidence only. Run in the same Supabase SQL Editor as postgres.
-- A single SELECT: no DDL, DML, history repair, recalculation or personal-record export.
-- The previous audit proves these tables and pg_cron exist in that snapshot.
select jsonb_pretty(jsonb_build_object(
 'collected_at',now(),
 'roles',(select jsonb_agg(to_jsonb(r) order by r.code) from public.roles r),
 'permissions',(select jsonb_agg(to_jsonb(p) order by p.code) from public.permissions p),
 'role_permissions',(select jsonb_agg(to_jsonb(r) order by r.role_code,r.permission_code) from public.role_permissions r),
 'photo_buckets',(select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'public',b.public,'file_size_limit',b.file_size_limit,'allowed_mime_types',b.allowed_mime_types) order by b.id)
   from storage.buckets b where b.id in ('profile-photos','club-photos')),
 'match_scoring_weights',(select jsonb_agg(to_jsonb(w) order by w.version,w.position_name) from private.match_scoring_weights w),
 'ovr_models',(select jsonb_agg(jsonb_build_object('version',m.version,'approved',m.approved,'minimum_cohort',m.minimum_cohort,'minimum_minutes',m.minimum_minutes,'minimum_matches',m.minimum_matches,'specification',m.specification) order by m.version)
   from private.ovr_models m),
 'ovr_category_mapping',(select jsonb_agg(to_jsonb(c) order by c.team_category) from private.ovr_category_mapping c),
 'photo_processing_settings',(select jsonb_agg(to_jsonb(s) order by s.id) from public.photo_processing_settings s),
 'oncex_cron_jobs',(select jsonb_agg(jsonb_build_object('jobname',j.jobname,'schedule',j.schedule,'active',j.active,'command',j.command,'database',j.database,'username',j.username) order by j.jobname)
   from cron.job j where j.jobname in ('oncex-team-plan-renewals','oncex-ovr-monthly-snapshots','oncex-card-daily')),
 'backfill_counts',jsonb_build_object(
   'auth_users_without_profile',(select count(*) from auth.users u where not exists(select 1 from public.profiles p where p.id=u.id)),
   'profiles_without_any_role',(select count(*) from public.profiles p where not exists(select 1 from public.user_roles ur where ur.user_id=p.id)),
   'current_players_without_identity',(select count(distinct tm.user_id) from public.team_members tm where tm.role_code='player' and not exists(select 1 from private.player_identities i where i.profile_id=tm.user_id))
 ),
 'assessment_history_summary',(select jsonb_agg(to_jsonb(s) order by s.model_version) from (
   select model_version,count(*) as assessment_count,min(assessed_at) as first_assessed_at,max(assessed_at) as last_assessed_at from private.ovr_assessments group by model_version
 ) s),
 'monthly_history_summary',(select jsonb_agg(to_jsonb(s) order by s.model_version) from (
   select model_version,count(*) as snapshot_count,min(month) as first_month,max(month) as last_month from private.ovr_monthly_snapshots group by model_version
 ) s)
)) as oncex_reconciliation_evidence;
