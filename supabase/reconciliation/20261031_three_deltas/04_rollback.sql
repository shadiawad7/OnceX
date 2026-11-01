-- PROPOSAL ONLY. NOT EXECUTED. DDL reversal, not a data/history rollback.
-- Use only after a successful patch and before any history repair, unless a separate
-- reviewed history plan accompanies it. Re-run 03 and save its output first.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
set local search_path=public,pg_catalog,extensions;
set local quote_all_identifiers=off;

do $rollback_preconditions$
declare expected record;
begin
 if current_user<>'postgres' then raise exception 'ABORT: rollback must run as postgres.';end if;
 if exists(select 1 from supabase_migrations.schema_migrations) then raise exception 'ABORT: history is no longer empty. A separate reviewed history reversal plan is required.';end if;
 for expected in select * from (values
  ('private.can_provision(uuid,text,uuid,uuid)','1e7e8c5ce56b7d2f5b78cd858a61774e'),
  ('public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[])','171a76538f134b88a92a2073cbed9468'),
  ('public.team_jersey_numbers(uuid,uuid)','8c352946731f6445085f693d8d2ee432'),
  ('private.require_starting_goalkeeper()','38b4b330133eb4d14630ee3e0221aadc')
 ) v(signature,source_md5) loop
  if not exists(select 1 from pg_proc p where p.oid=to_regprocedure(expected.signature)
   and md5(p.prosrc)=expected.source_md5 and pg_get_userbyid(p.proowner)='postgres'
   and p.prokind='f' and p.prosecdef and not p.proisstrict and not p.proleakproof
   and p.proparallel='u' and not p.proretset
   and p.provolatile=case when expected.signature in ('private.can_provision(uuid,text,uuid,uuid)','public.team_jersey_numbers(uuid,uuid)') then 's'::"char" else 'v'::"char" end
   and (select lanname from pg_language where oid=p.prolang)=case when expected.signature='private.can_provision(uuid,text,uuid,uuid)' then 'sql' else 'plpgsql' end
   and p.pronargdefaults=case when expected.signature in ('public.team_jersey_numbers(uuid,uuid)','public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[])') then 1 else 0 end
   and p.prorettype=to_regtype(case expected.signature
     when 'private.can_provision(uuid,text,uuid,uuid)' then 'boolean'
     when 'public.team_jersey_numbers(uuid,uuid)' then 'integer[]'
     when 'private.require_starting_goalkeeper()' then 'trigger' else 'uuid' end)
   and p.proargnames is not distinct from case expected.signature
     when 'private.can_provision(uuid,text,uuid,uuid)' then array['actor','kind','target_club','target_team']::text[]
     when 'public.team_jersey_numbers(uuid,uuid)' then array['target_team','excluded_player']::text[]
     when 'public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[])' then array['target_team','target_match','opponent_name','match_date','match_duration','starter_ids','substitute_ids']::text[]
     else null::text[] end
   and coalesce(cardinality(p.proconfig),0)=1
   and exists(select 1 from unnest(p.proconfig) s(value) where split_part(s.value,'=',1)='search_path' and btrim(split_part(s.value,'=',2),'"')='')) then
   raise exception 'ABORT: patched function missing or subsequently changed: %',expected.signature;
  end if;
 end loop;
 for expected in select * from (values
  ('private.is_team_coach(uuid)','b925edb6b494222c1a9088ea1bd6dd31','postgres','{postgres=X/postgres,authenticated=X/postgres}'),
  ('private.can_manage_match_team(uuid)','efc5dfbc2378116fe5ec8d87681a0842','postgres','{postgres=X/postgres}'),
  ('public.team_jersey_available(uuid,integer,uuid)','483eef7f0731f0f9cce1f442485f8585','postgres','{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}'),
  ('public.save_match_lineup_v2(uuid,uuid,text,date,integer,uuid[],text,uuid[])','ebf06d6766797b610db99a9661201272','postgres','{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}'),
  ('public.confirm_match_statistics_v3(uuid,integer,integer,jsonb,integer,text,text,text)','e4fb6ff98b374e633677088863b05d0d','postgres','{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}'),
  ('private.oncex_points_v2(text,integer,integer,integer,integer,integer,integer,integer,boolean,integer,integer)','9a7813e192706df37c94798b1f7ba908','postgres','{postgres=X/postgres}'),
  ('private.card_inputs(text)','9f8f288a89186092c84b008a1f573883','postgres','{postgres=X/postgres}'),
  ('private.refresh_card_season(text)','32bb24ca28a52e5fd1590de523439df1','postgres','{postgres=X/postgres}'),
  ('public.player_ovr_evolution(uuid,text)','62819b3a5af4b96ed80ce461e21ace86','postgres','{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}')
 ) v(signature,definition_md5,owner_name,acl) loop
  if not exists(select 1 from pg_proc p where p.oid=to_regprocedure(expected.signature)
   and md5(pg_get_functiondef(p.oid))=expected.definition_md5
   and pg_get_userbyid(p.proowner)=expected.owner_name and p.proacl::text is not distinct from expected.acl) then
   raise exception 'ABORT: protected function changed since patch: %',expected.signature;
  end if;
 end loop;
 if not exists(select 1 from pg_policy p where p.polrelid='public.teams'::regclass and p.polname='teams_update_assigned_coach'
   and p.polcmd='w' and p.polpermissive
   and p.polroles=array[(select oid from pg_roles where rolname='authenticated')]::oid[]
   and regexp_replace(pg_get_expr(p.polqual,p.polrelid),'[[:space:]]','','g')='private.is_team_coach(id)'
   and regexp_replace(pg_get_expr(p.polwithcheck,p.polrelid),'[[:space:]]','','g')='(private.is_team_coach(id)AND(EXISTS(SELECT1FROMteam_memberstmWHERE((tm.team_id=teams.id)AND(tm.club_id=teams.club_id)AND(tm.user_id=(SELECTauth.uid()ASuid))AND(tm.role_code=''coach''::text)))))')
 or not exists(select 1 from pg_trigger t where t.tgrelid='public.team_matches'::regclass and t.tgname='match_requires_goalkeeper'
   and t.tgfoid=to_regprocedure('private.require_starting_goalkeeper()')
   and not t.tgisinternal and t.tgtype=19 /* ROW | BEFORE | UPDATE */
   and t.tgenabled='O' and t.tgqual is null and t.tgnargs=0 and t.tgattr=''::int2vector) then
  raise exception 'ABORT: patched policy or trigger changed. Review reversal manually.';
 end if;
 if (select p.proacl::text from pg_proc p where p.oid=to_regprocedure('private.can_provision(uuid,text,uuid,uuid)')) is distinct from '{postgres=X/postgres}'
 or (select p.proacl::text from pg_proc p where p.oid=to_regprocedure('public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[])')) is distinct from '{postgres=X/postgres,service_role=X/postgres}'
 or (select p.proacl::text from pg_proc p where p.oid=to_regprocedure('public.team_jersey_numbers(uuid,uuid)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}'
 or (select p.proacl::text from pg_proc p where p.oid=to_regprocedure('private.require_starting_goalkeeper()')) is distinct from '{postgres=X/postgres}' then
  raise exception 'ABORT: ACL changed since patch. Review reversal manually.';
 end if;
end;
$rollback_preconditions$;

-- RESTRICT/default: no CASCADE. Later dependencies cause a complete rollback.
drop trigger match_requires_goalkeeper on public.team_matches;
drop function private.require_starting_goalkeeper();
drop function public.team_jersey_numbers(uuid,uuid);
drop policy teams_update_assigned_coach on public.teams;

-- Restore exact audited definitions. CREATE OR REPLACE preserves owner/ACL/OID.
CREATE OR REPLACE FUNCTION private.can_provision(actor uuid, kind text, target_club uuid, target_team uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select actor is not null and kind in ('club','team','coach','player') and (
 exists(select 1 from public.user_roles where user_id=actor and role_code='super_admin' and club_id is null)
 or (kind='team' and exists(select 1 from public.user_roles where user_id=actor and role_code='club_admin' and club_id=target_club))
 or (kind in ('coach','player') and exists(
  select 1 from public.teams t where t.id=target_team and t.club_id=target_club and (
   exists(select 1 from public.user_roles ur where ur.user_id=actor and ur.role_code='club_admin' and ur.club_id=t.club_id)
   or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.user_id=actor and (tm.role_code='team_admin' or (kind='player' and tm.role_code='coach')))
  )
 )));
$function$;

CREATE OR REPLACE FUNCTION public.save_match_lineup(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], substitute_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare saved uuid:=target_match; all_players uuid[]; total integer;
begin
 if not private.can_manage_match_team(target_team) then raise exception 'No puedes registrar partidos de este equipo.' using errcode='42501';end if;
 -- Serialize roster edits with match creation/confirmation.
 perform 1 from public.teams where id=target_team for update;
 if cardinality(starter_ids) is distinct from 11 or (select count(distinct value) from unnest(starter_ids) value)<>11 then
  raise exception 'Debes seleccionar exactamente 11 titulares distintos antes de registrar estadísticas.' using errcode='22023';
 end if;
 all_players:=starter_ids||coalesce(substitute_ids,'{}');
 if (select count(distinct value) from unnest(all_players) value)<>cardinality(all_players) then raise exception 'Un jugador no puede estar repetido ni ser titular y suplente.' using errcode='22023';end if;
 select count(*) into total from public.team_members where team_id=target_team and role_code='player' and user_id=any(all_players);
 if total<>cardinality(all_players) then raise exception 'Todos los jugadores deben estar registrados en este equipo.' using errcode='22023';end if;
 if opponent_name is null or length(trim(opponent_name)) not between 1 and 120 or match_date is null or match_duration is null or match_duration not between 1 and 150 then
  raise exception 'Completa rival, fecha y duración del partido.' using errcode='22023';end if;
 if saved is null then
  insert into public.team_matches(team_id,opponent,played_on,duration,created_by) values(target_team,trim(opponent_name),match_date,match_duration,auth.uid()) returning id into saved;
 else
  perform 1 from public.team_matches where id=saved and team_id=target_team and status='draft' for update;
  if not found then raise exception 'El partido no existe o ya está confirmado.' using errcode='22023';end if;
  update public.team_matches set opponent=trim(opponent_name),played_on=match_date,duration=match_duration where id=saved;
  delete from public.match_players where match_id=saved;
 end if;
 insert into public.match_players(match_id,player_id,player_name,player_position,starter)
 select saved,p.id,p.full_name,coalesce(p.position,''),p.id=any(starter_ids) from public.profiles p where p.id=any(all_players);
 return saved;
end;
$function$;

commit;
