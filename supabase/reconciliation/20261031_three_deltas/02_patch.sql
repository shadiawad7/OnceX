-- PROPOSAL ONLY. NOT EXECUTED. Outside active migrations intentionally.
-- Exact missing deltas for 202610100004, 202610120001 and 202610220002.
-- Run 01 first, export backups, obtain approval and test on a disposable database.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
set local search_path=public,pg_catalog,extensions;
set local quote_all_identifiers=off;

do $preconditions$
declare expected record;
begin
 if current_user<>'postgres' then raise exception 'ABORT: run this reviewed patch as postgres.';end if;
 if exists(select 1 from supabase_migrations.schema_migrations) then raise exception 'ABORT: migration history changed since audit. Re-audit before patching.';end if;
 for expected in select * from (values
  ('private.can_provision(uuid,text,uuid,uuid)','25cd2b723fa8d3e71ee9239bd475b6e6','postgres','{postgres=X/postgres}'),
  ('public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[])','2e64129868f557554ec216921d0ffb1f','postgres','{postgres=X/postgres,service_role=X/postgres}'),
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
   and pg_get_userbyid(p.proowner)=expected.owner_name
   and p.proacl::text is not distinct from expected.acl) then
   raise exception 'ABORT: audited definition, owner or ACL changed: %',expected.signature;
  end if;
 end loop;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='public' and p.proname='team_jersey_numbers')
     or (n.nspname='private' and p.proname='require_starting_goalkeeper')) then
  raise exception 'ABORT: a new function name already exists. Re-audit; do not recreate it.';
 end if;
 if exists(select 1 from pg_policy where polrelid='public.teams'::regclass and polname='teams_update_assigned_coach')
 or exists(select 1 from pg_trigger where tgrelid='public.team_matches'::regclass and tgname='match_requires_goalkeeper') then
  raise exception 'ABORT: policy or trigger already exists. Re-audit.';
 end if;
 if not exists(select 1 from pg_default_acl
  where defaclrole=(select oid from pg_roles where rolname='postgres')
   and defaclnamespace='public'::regnamespace and defaclobjtype='f'
   and defaclacl::text='{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}') then
  raise exception 'ABORT: public function default privileges changed.';
 end if;
end;
$preconditions$;

-- Delta 202610100004: only the missing policy.
create policy teams_update_assigned_coach on public.teams for update to authenticated
 using(private.is_team_coach(id))
 with check(private.is_team_coach(id) and exists(select 1 from public.team_members tm
  where tm.team_id=teams.id and tm.club_id=teams.club_id and tm.user_id=(select auth.uid()) and tm.role_code='coach'));

-- Delta 202610120001: only the missing authorization expansion.
create or replace function private.can_provision(actor uuid, kind text, target_club uuid, target_team uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select actor is not null and kind in ('club','team','coach','player') and (
 exists(select 1 from public.user_roles where user_id=actor and role_code='super_admin' and club_id is null)
 or (kind='team' and exists(select 1 from public.user_roles where user_id=actor and role_code='club_admin' and club_id=target_club))
 or (kind in ('coach','player') and exists(
  select 1 from public.teams t where t.id=target_team and t.club_id=target_club and (
   exists(select 1 from public.user_roles ur where ur.user_id=actor and ur.role_code='club_admin' and ur.club_id=t.club_id)
   or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.user_id=actor and tm.role_code in ('team_admin','coach'))
  )
 )));
$$;

-- Delta 202610220002: only missing functions, validation, trigger and grants.
create function public.team_jersey_numbers(target_team uuid,excluded_player uuid default null) returns integer[]
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.team_jersey_available(target_team,1,excluded_player);
 return(select coalesce(array_agg(distinct p.jersey_number),'{}'::integer[]) from public.team_members tm join public.profiles p on p.id=tm.user_id where tm.team_id=target_team and tm.role_code='player' and p.id is distinct from excluded_player and p.jersey_number is not null);
end;$$;
revoke all on function public.team_jersey_numbers(uuid,uuid) from public,anon;
grant execute on function public.team_jersey_numbers(uuid,uuid) to authenticated;

create or replace function public.save_match_lineup(target_team uuid,target_match uuid,opponent_name text,match_date date,match_duration integer,starter_ids uuid[],substitute_ids uuid[] default '{}')
returns uuid language plpgsql security definer set search_path='' as $$
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
 if not exists(select 1 from public.profiles where id=any(starter_ids) and position='Portero') then raise exception 'Los 11 titulares deben incluir al menos un portero.' using errcode='22023';end if;
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
$$;

create function private.require_starting_goalkeeper() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='confirmed' and not exists(select 1 from public.match_players where match_id=new.id and starter and player_position='Portero') then raise exception 'Los 11 titulares deben incluir al menos un portero.' using errcode='22023';end if;
 return new;
end;$$;
create trigger match_requires_goalkeeper before update on public.team_matches for each row execute function private.require_starting_goalkeeper();
revoke all on function private.require_starting_goalkeeper() from public,anon,authenticated;

commit;
