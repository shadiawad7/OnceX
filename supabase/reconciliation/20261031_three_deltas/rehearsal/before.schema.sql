--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: private; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA private;


ALTER SCHEMA private OWNER TO postgres;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: apply_due_team_plans(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.apply_due_team_plans() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$ begin return; end; $$;


ALTER FUNCTION private.apply_due_team_plans() OWNER TO postgres;

--
-- Name: can_manage_match_team(uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.can_manage_match_team(target_team uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select exists(select 1 from public.teams t where t.id=target_team and (private.has_permission('members.manage',t.club_id) or private.is_team_coach(t.id)));
$$;


ALTER FUNCTION private.can_manage_match_team(target_team uuid) OWNER TO postgres;

--
-- Name: can_manage_photo(uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.can_manage_photo(target_user uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select exists(select 1 from public.profiles where id=target_user) and (
 (target_user=auth.uid() and exists(select 1 from public.user_roles where user_id=auth.uid() and role_code<>'player'))
 or private.has_permission('platform.manage') or public.can_edit_player(target_user)
 or exists(select 1 from public.user_roles ur where ur.user_id=target_user and private.has_permission('members.manage',ur.club_id))
 or exists(select 1 from public.team_members tm where tm.user_id=target_user and private.is_team_admin(tm.team_id)));
$$;


ALTER FUNCTION private.can_manage_photo(target_user uuid) OWNER TO postgres;

--
-- Name: can_provision(uuid, text, uuid, uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.can_provision(actor uuid, kind text, target_club uuid, target_team uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select actor is not null and kind in ('club','team','coach','player') and (
 exists(select 1 from public.user_roles where user_id=actor and role_code='super_admin' and club_id is null)
 or (kind='team' and exists(select 1 from public.user_roles where user_id=actor and role_code='club_admin' and club_id=target_club))
 or (kind in ('coach','player') and exists(
  select 1 from public.teams t where t.id=target_team and t.club_id=target_club and (
   exists(select 1 from public.user_roles ur where ur.user_id=actor and ur.role_code='club_admin' and ur.club_id=t.club_id)
   or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.user_id=actor and (tm.role_code='team_admin' or (kind='player' and tm.role_code='coach')))
  )
 )));
$$;


ALTER FUNCTION private.can_provision(actor uuid, kind text, target_club uuid, target_team uuid) OWNER TO postgres;

--
-- Name: can_read_match_team(uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.can_read_match_team(target_team uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select exists(select 1 from public.teams t where t.id=target_team and (
 private.has_permission('members.manage',t.club_id) or private.is_team_admin(t.id)
 or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.user_id=auth.uid())));
$$;


ALTER FUNCTION private.can_read_match_team(target_team uuid) OWNER TO postgres;

--
-- Name: can_read_photo(uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.can_read_photo(target_user uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select target_user=auth.uid() or private.has_permission('platform.manage')
 or exists(select 1 from public.user_roles ur where ur.user_id=target_user and private.has_permission('clubs.read',ur.club_id));
$$;


ALTER FUNCTION private.can_read_photo(target_user uuid) OWNER TO postgres;

--
-- Name: can_view_profile(uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.can_view_profile(target_user uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select target_user=(select auth.uid()) or private.has_permission('platform.manage')
 or exists(select 1 from public.user_roles ur where ur.user_id=target_user and private.has_permission('profiles.read_club',ur.club_id))
 or exists(select 1 from public.team_members tm where tm.user_id=target_user and (
  private.is_team_coach(tm.team_id) or private.is_team_admin(tm.team_id)
  or (tm.role_code in ('coach','team_admin') and private.is_team_player(tm.team_id))));
$$;


ALTER FUNCTION private.can_view_profile(target_user uuid) OWNER TO postgres;

--
-- Name: card_inputs(text); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.card_inputs(target_season text) RETURNS TABLE(identity_id uuid, position_name text, category_key text, matches integer, minutes integer, participation numeric, fin numeric, cre numeric, imp numeric, dis numeric, reg numeric, efi numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 with appearances as (
 select i.id identity_id,mp.player_position position_name,coalesce(c.category_key,nullif(trim(t.category),'')) category_key,
 m.team_id,m.played_on,m.duration,mp.minutes,mp.goals,mp.assists,mp.own_goals,mp.yellow_cards,mp.red_cards,mp.clean_sheet,mp.oncex_points
 from public.match_players mp join public.team_matches m on m.id=mp.match_id join public.teams t on t.id=m.team_id
 join private.player_identities i on i.profile_id=mp.player_id
 left join private.ovr_category_mapping c on c.team_category=t.category
 where m.status='confirmed' and m.season_code=target_season and mp.player_position in ('Defensa','Centrocampista','Delantero')
 and m.played_on<=current_date and mp.minutes>=0 and mp.oncex_points is not null
 ), aggregate_stats as (
 select a.identity_id,a.position_name,a.category_key,count(*) filter(where a.minutes>0)::integer matches,sum(a.minutes)::integer minutes,
 sum(a.minutes::numeric/a.duration) units,sum(a.oncex_points) points,sum(a.goals) goals,sum(a.assists) assists,sum(a.own_goals) own_goals,
 sum(a.yellow_cards) yellows,sum(a.red_cards) reds,count(*) filter(where a.clean_sheet) cleans
 from appearances a where a.category_key is not null group by a.identity_id,a.position_name,a.category_key having sum(a.minutes)>0
 ), starts as (
 select identity_id,position_name,category_key,team_id,min(played_on) since from appearances group by identity_id,position_name,category_key,team_id
 ), opportunities as (
 select s.identity_id,s.position_name,s.category_key,count(*)::numeric possible,sum(m.duration)::numeric possible_minutes
 from starts s join public.team_matches m on m.team_id=s.team_id and m.status='confirmed' and m.season_code=target_season and m.played_on>=s.since and m.played_on<=current_date
 group by s.identity_id,s.position_name,s.category_key
 ), ratios as (
 select a.*,least(1::numeric,a.minutes/o.possible_minutes) participation,
 a.points production,
 100*(least(1::numeric,a.minutes/o.possible_minutes)*0.7+least(1::numeric,a.matches/o.possible)*0.3) regularity,
 (model.specification->>'discipline_red_weight')::numeric red_weight
 from aggregate_stats a join opportunities o using(identity_id,position_name,category_key)
 join private.ovr_models model on model.version='oncex-card-v3' and model.approved
 )
 select identity_id,position_name,category_key,matches,minutes,participation,goals/units,assists/units,
 production,-(yellows+red_weight*reds)/units,regularity,production/units from ratios;
$$;


ALTER FUNCTION private.card_inputs(target_season text) OWNER TO postgres;

--
-- Name: check_member_jersey(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.check_member_jersey() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare jersey integer;
begin
 if new.role_code<>'player' then return new;end if;
 select jersey_number into jersey from public.profiles where id=new.user_id for update;
 if jersey is null then return new;end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('oncex-team-jersey:'||new.team_id::text,0));
 if exists(select 1 from public.team_members tm join public.profiles p on p.id=tm.user_id where tm.team_id=new.team_id and tm.role_code='player' and p.id<>new.user_id and p.jersey_number=jersey) then raise exception 'Este dorsal ya está ocupado por otro jugador del equipo. Elige otro número.' using errcode='23505';end if;
 return new;
end;$$;


ALTER FUNCTION private.check_member_jersey() OWNER TO postgres;

--
-- Name: check_player_jersey(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.check_player_jersey() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare team record;
begin
 if new.jersey_number is null or new.jersey_number is not distinct from old.jersey_number then return new;end if;
 for team in select distinct team_id from public.team_members where user_id=new.id and role_code='player' order by team_id loop
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('oncex-team-jersey:'||team.team_id::text,0));
 end loop;
 if exists(select 1 from public.team_members own join public.team_members other on other.team_id=own.team_id and other.role_code='player' join public.profiles p on p.id=other.user_id where own.user_id=new.id and own.role_code='player' and p.id<>new.id and p.jersey_number=new.jersey_number) then raise exception 'Este dorsal ya está ocupado por otro jugador del equipo. Elige otro número.' using errcode='23505';end if;
 return new;
end;$$;


ALTER FUNCTION private.check_player_jersey() OWNER TO postgres;

--
-- Name: check_team_plan(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.check_team_plan() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
 if TG_OP='UPDATE' then
  if row(new.plan_code,new.plan_activated_at,new.plan_period_ends_at,new.pending_plan_code,new.plan_change_requested_at)
   is distinct from row(old.plan_code,old.plan_activated_at,old.plan_period_ends_at,old.pending_plan_code,old.plan_change_requested_at)
   and current_user <> pg_catalog.pg_get_userbyid((select relowner from pg_catalog.pg_class where oid='public.teams'::regclass)) then
    raise exception 'Programa el cambio desde la pestaña Plan y confirma sus condiciones.' using errcode='42501';
  end if;
 elsif new.plan_code<>'basic' and current_user <> pg_catalog.pg_get_userbyid((select relowner from pg_catalog.pg_class where oid='public.teams'::regclass)) and not private.has_permission('members.manage',new.club_id) then
  raise exception 'No puedes asignar el plan inicial.' using errcode='42501';
 end if;
 return new;
end;
$$;


ALTER FUNCTION private.check_team_plan() OWNER TO postgres;

--
-- Name: close_ovr_month(date); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.close_ovr_month(target_month date) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    SET "TimeZone" TO 'Europe/Madrid'
    AS $$
declare inserted integer;
begin
 if target_month is null or extract(day from target_month)<>1 or target_month>=date_trunc('month',now())::date then raise exception 'Solo se pueden cerrar meses completos.' using errcode='22023';end if;
 insert into private.ovr_monthly_snapshots(identity_id,season_code,month,assessment_id,overall,attributes,model_version,reliability,comparable_count)
 select a.identity_id,a.season_code,target_month,a.id,a.overall,a.attributes,a.model_version,a.reliability,a.comparable_count
 from (select distinct on(identity_id,season_code) * from private.ovr_assessments where assessed_at>=target_month::timestamptz and assessed_at<(target_month+interval '1 month')::timestamptz order by identity_id,season_code,assessed_at desc,id desc) a
 on conflict(identity_id,season_code,month) do nothing;
 get diagnostics inserted=row_count;return inserted;
end;$$;


ALTER FUNCTION private.close_ovr_month(target_month date) OWNER TO postgres;

--
-- Name: ensure_player_identity(uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.ensure_player_identity(target_player uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare identity uuid; email_address text; player_label text;
begin
 select id into identity from private.player_identities where profile_id=target_player;
 if found then return identity;end if;
 select lower(trim(u.email)),p.full_name into email_address,player_label from auth.users u join public.profiles p on p.id=u.id where u.id=target_player;
 if email_address is null or email_address='' then raise exception 'La cuenta necesita un email para conservar su identidad.';end if;
 insert into private.player_identities(profile_id,recovery_email,player_name) values(target_player,email_address,player_label)
 on conflict(recovery_email) do update set profile_id=excluded.profile_id
 where private.player_identities.profile_id is null or private.player_identities.profile_id=excluded.profile_id
 returning id into identity;
 if identity is null then raise exception 'Esta identidad ya está vinculada a otra cuenta.';end if;
 return identity;
end;$$;


ALTER FUNCTION private.ensure_player_identity(target_player uuid) OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
 -- Never trust client metadata for privileges.
 insert into public.user_roles(user_id, role_code) values (new.id, 'player');
 return new;
end;
$$;


ALTER FUNCTION private.handle_new_user() OWNER TO postgres;

--
-- Name: has_permission(text, uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.has_permission(permission text, target_club uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select exists (
   select 1 from public.user_roles ur
   join public.role_permissions rp on rp.role_code = ur.role_code
   where ur.user_id = (select auth.uid()) and rp.permission_code = permission
     and ((ur.role_code = 'super_admin' and ur.club_id is null)
       or (target_club is not null and ur.club_id = target_club))
 );
$$;


ALTER FUNCTION private.has_permission(permission text, target_club uuid) OWNER TO postgres;

--
-- Name: is_team_admin(uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.is_team_admin(target_team uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select exists(select 1 from public.team_members where team_id=target_team and user_id=(select auth.uid()) and role_code='team_admin');
$$;


ALTER FUNCTION private.is_team_admin(target_team uuid) OWNER TO postgres;

--
-- Name: is_team_coach(uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.is_team_coach(target_team uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select exists(select 1 from public.team_members tm where tm.team_id = target_team
   and tm.user_id = (select auth.uid()) and tm.role_code = 'coach');
$$;


ALTER FUNCTION private.is_team_coach(target_team uuid) OWNER TO postgres;

--
-- Name: is_team_player(uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.is_team_player(target_team uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select exists(select 1 from public.team_members where team_id=target_team and user_id=(select auth.uid()) and role_code='player');
$$;


ALTER FUNCTION private.is_team_player(target_team uuid) OWNER TO postgres;

--
-- Name: keep_ovr_history(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.keep_ovr_history() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin raise exception 'El histórico de OVR es inmutable. Registra una nueva valoración sin sobrescribir el pasado.' using errcode='55000';end;$$;


ALTER FUNCTION private.keep_ovr_history() OWNER TO postgres;

--
-- Name: next_team_plan_period(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.next_team_plan_period(anchor timestamp with time zone, at_time timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    SET "TimeZone" TO 'UTC'
    AS $$
declare months integer; result timestamptz;
begin
 months:=greatest(1,(extract(year from at_time)::integer-extract(year from anchor)::integer)*12+extract(month from at_time)::integer-extract(month from anchor)::integer+1);
 while months>1 and anchor+((months-1)*interval '1 month')>at_time loop months:=months-1;end loop;
 result:=anchor+(months*interval '1 month');
 while result<=at_time loop months:=months+1;result:=anchor+(months*interval '1 month');end loop;
 return result;
end;
$$;


ALTER FUNCTION private.next_team_plan_period(anchor timestamp with time zone, at_time timestamp with time zone) OWNER TO postgres;

--
-- Name: oncex_match_points(text, integer, integer, integer, integer, integer, integer, boolean); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.oncex_match_points(position_name text, played_minutes integer, goals integer, own_goals integer, assists integer, yellow_cards integer, red_cards integer, clean_sheet boolean) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $$
declare goal_points integer; assist_points integer; clean_points integer;
begin
 case position_name
 when 'Portero' then goal_points:=8;assist_points:=3;clean_points:=4;
 when 'Defensa' then goal_points:=6;assist_points:=3;clean_points:=4;
 when 'Centrocampista' then goal_points:=5;assist_points:=3;clean_points:=1;
 when 'Delantero' then goal_points:=4;assist_points:=2;clean_points:=0;
 else raise exception 'Define la posición de todos los jugadores antes de confirmar el partido.' using errcode='22023';
 end case;
 return case when played_minutes>0 then 1 else 0 end + played_minutes*0.01 + goals*goal_points-own_goals*3+assists*assist_points-yellow_cards-red_cards*3+case when clean_sheet then clean_points else 0 end;
end;
$$;


ALTER FUNCTION private.oncex_match_points(position_name text, played_minutes integer, goals integer, own_goals integer, assists integer, yellow_cards integer, red_cards integer, clean_sheet boolean) OWNER TO postgres;

--
-- Name: oncex_points_v2(text, integer, integer, integer, integer, integer, integer, integer, boolean, integer, integer); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.oncex_points_v2(position_name text, duration integer, mins integer, goals integer, own_goals integer, assists integer, yellows integer, reds integer, clean boolean, team_goals integer, opponent_goals integer) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare w private.match_scoring_weights; parts jsonb; total numeric;
begin
 select * into w from private.match_scoring_weights where version='oncex-match-v2' and match_scoring_weights.position_name=oncex_points_v2.position_name;
 if not found then raise exception 'Define la posición del jugador antes de confirmar.' using errcode='22023';end if;
 parts:=jsonb_build_object('participation',case when mins>=round(duration*2.0/3) then 2 else 0 end,'goals',goals*w.goal,'ownGoals',own_goals*w.own_goal,'assists',assists*w.assist,'yellowCards',yellows*w.yellow,'redCards',reds*w.red,'cleanSheet',case when clean then w.clean_sheet else 0 end,'result',case when mins>0 then case when team_goals>opponent_goals then 2 when team_goals=opponent_goals then 1 else 0 end else 0 end);
 select sum(value::numeric) into total from jsonb_each_text(parts);
 return jsonb_build_object('version','oncex-match-v2','parts',parts,'total',total);
end;$$;


ALTER FUNCTION private.oncex_points_v2(position_name text, duration integer, mins integer, goals integer, own_goals integer, assists integer, yellows integer, reds integer, clean boolean, team_goals integer, opponent_goals integer) OWNER TO postgres;

--
-- Name: ovr_comparable_population(text, text, text, text); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.ovr_comparable_population(target_position text, target_category text, target_season text, target_model text) RETURNS TABLE(identity_id uuid, matches bigint, minutes bigint, goals bigint, own_goals bigint, assists bigint, yellow_cards bigint, red_cards bigint, clean_sheets bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select i.id,count(*) filter(where mp.minutes>0),sum(mp.minutes)::bigint,sum(mp.goals)::bigint,sum(mp.own_goals)::bigint,sum(mp.assists)::bigint,sum(mp.yellow_cards)::bigint,sum(mp.red_cards)::bigint,count(*) filter(where mp.clean_sheet)
 from public.match_players mp join public.team_matches m on m.id=mp.match_id
 join public.teams t on t.id=m.team_id join private.ovr_category_mapping c on c.team_category=t.category
 join private.player_identities i on i.profile_id=mp.player_id join private.ovr_models model on model.version=target_model and model.approved
 where m.status='confirmed' and m.season_code=target_season and mp.player_position=target_position and c.category_key=target_category
 group by i.id,model.minimum_matches,model.minimum_minutes
 having count(*) filter(where mp.minutes>0)>=model.minimum_matches and sum(mp.minutes)>=model.minimum_minutes;
$$;


ALTER FUNCTION private.ovr_comparable_population(target_position text, target_category text, target_season text, target_model text) OWNER TO postgres;

--
-- Name: photo_user(text); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.photo_user(object_name text) RETURNS uuid
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $_$
 select case when object_name ~ '^[0-9a-fA-F-]{36}/portrait$' and split_part(object_name,'/',1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then split_part(object_name,'/',1)::uuid else null end;
$_$;


ALTER FUNCTION private.photo_user(object_name text) OWNER TO postgres;

--
-- Name: recalculate_deleted_match_player(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.recalculate_deleted_match_player() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if old.player_id is not null then
  update public.profiles p set oncex_score=(select coalesce(sum(mp.oncex_points),0) from public.match_players mp join public.team_matches m on m.id=mp.match_id where mp.player_id=old.player_id and m.status='confirmed') where p.id=old.player_id;
 end if;
 return old;
end;
$$;


ALTER FUNCTION private.recalculate_deleted_match_player() OWNER TO postgres;

--
-- Name: record_activity(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.record_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 insert into public.activity_log(actor_id,entity,action)
 values ((select auth.uid()),tg_table_name,tg_op);
 return null;
end;
$$;


ALTER FUNCTION private.record_activity() OWNER TO postgres;

--
-- Name: refresh_all_cards(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.refresh_all_cards() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare season text;begin
 for season in select distinct season_code from public.team_matches where status='confirmed' and season_code is not null loop
  perform private.refresh_card_season(season);
 end loop;
end;$$;


ALTER FUNCTION private.refresh_all_cards() OWNER TO postgres;

--
-- Name: refresh_card_season(text); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.refresh_card_season(target_season text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare policy private.ovr_models; item record; attributes jsonb; reliability numeric; score numeric; weights jsonb; inserted integer:=0;
begin
 -- Serialize computations without exposing the cross-club population to API clients.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('oncex-card-calculation',0));
 select * into policy from private.ovr_models where version='oncex-card-v3' and approved;
 if not found then return 0;end if;
 for item in
 with eligible as (select * from private.card_inputs(target_season) where matches>=policy.minimum_matches and minutes>=policy.minimum_minutes),
 ranked as (
 select e.*,count(*) over cohort population,
 rank() over(partition by position_name,category_key order by fin) rf,count(*) over(partition by position_name,category_key,fin) tf,
 rank() over(partition by position_name,category_key order by cre) rc,count(*) over(partition by position_name,category_key,cre) tc,
 rank() over(partition by position_name,category_key order by imp) ri,count(*) over(partition by position_name,category_key,imp) ti,
 rank() over(partition by position_name,category_key order by dis) rd,count(*) over(partition by position_name,category_key,dis) td,
 rank() over(partition by position_name,category_key order by reg) rr,count(*) over(partition by position_name,category_key,reg) tr,
 rank() over(partition by position_name,category_key order by efi) re,count(*) over(partition by position_name,category_key,efi) te
 from eligible e window cohort as (partition by position_name,category_key)
 ) select * from ranked where population>=policy.minimum_cohort
 loop
  reliability:=least(1::numeric,item.minutes/(policy.specification->>'reliable_minutes')::numeric,item.matches/(policy.specification->>'reliable_matches')::numeric);
  attributes:=jsonb_build_object(
   'FIN',round(50+reliability*(coalesce(99*(item.rf-1+(item.tf-1)/2.0)/nullif(item.population-1,0),50)-50)),
   'CRE',round(50+reliability*(coalesce(99*(item.rc-1+(item.tc-1)/2.0)/nullif(item.population-1,0),50)-50)),
   'IMP',round(50+reliability*(coalesce(99*(item.ri-1+(item.ti-1)/2.0)/nullif(item.population-1,0),50)-50)),
   'DIS',round(50+reliability*(coalesce(99*(item.rd-1+(item.td-1)/2.0)/nullif(item.population-1,0),50)-50)),
   'REG',round(greatest(0,least(99,50+reliability*(item.reg-50)))),
   'EFI',round(50+reliability*(coalesce(99*(item.re-1+(item.te-1)/2.0)/nullif(item.population-1,0),50)-50)));
  weights:=policy.specification->'overall'->item.position_name;
  score:=round((attributes->>'FIN')::numeric*(weights->>0)::numeric+(attributes->>'CRE')::numeric*(weights->>1)::numeric+(attributes->>'IMP')::numeric*(weights->>2)::numeric+(attributes->>'DIS')::numeric*(weights->>3)::numeric+(attributes->>'REG')::numeric*(weights->>4)::numeric+(attributes->>'EFI')::numeric*(weights->>5)::numeric);
  insert into private.ovr_assessments(identity_id,season_code,position_name,category_key,model_version,assessed_at,data_cutoff,overall,attributes,comparable_count,reliability,participated_minutes,participated_matches)
  values(item.identity_id,target_season,item.position_name,item.category_key,policy.version,clock_timestamp(),now(),score,attributes,item.population,reliability,item.minutes,item.matches);
  inserted:=inserted+1;
 end loop;
 return inserted;
end;$$;


ALTER FUNCTION private.refresh_card_season(target_season text) OWNER TO postgres;

--
-- Name: refresh_cards_after_match(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.refresh_cards_after_match() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if new.status='confirmed' and new.season_code is not null then perform private.refresh_card_season(new.season_code);end if;
 if old.status='confirmed' and old.season_code is distinct from new.season_code and old.season_code is not null then perform private.refresh_card_season(old.season_code);end if;
 return new;
end;$$;


ALTER FUNCTION private.refresh_cards_after_match() OWNER TO postgres;

--
-- Name: refresh_player_licence(uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.refresh_player_licence(target_licence uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare l private.player_licences; period_start timestamptz; period_end timestamptz;
begin
 select * into l from private.player_licences where id=target_licence for update;
 if l.activated_at is null then return;end if;
 period_end:=l.current_period_end;
 while period_end<=now() and (l.stop_at is null or period_end<l.stop_at) loop
  period_start:=period_end;
  period_end:=private.next_team_plan_period(l.activated_at,period_start);
  insert into private.licence_periods(licence_id,starts_at,ends_at) values(l.id,period_start,period_end) on conflict do nothing;
 end loop;
 update private.player_licences set current_period_end=period_end where id=l.id;
end;$$;


ALTER FUNCTION private.refresh_player_licence(target_licence uuid) OWNER TO postgres;

--
-- Name: register_player_identity(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.register_player_identity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if new.role_code='player' then perform private.ensure_player_identity(new.user_id);end if;return new;
end;$$;


ALTER FUNCTION private.register_player_identity() OWNER TO postgres;

--
-- Name: renew_team_plan(uuid); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.renew_team_plan(target_team uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare t public.teams;
begin
 select * into t from public.teams where id=target_team for update;
 if not found or t.plan_period_ends_at>now() then return;end if;
 if t.pending_plan_code is not null then
  update public.teams set plan_code=t.pending_plan_code,plan_activated_at=t.plan_period_ends_at,
   plan_period_ends_at=private.next_team_plan_period(t.plan_period_ends_at,now()),pending_plan_code=null,plan_change_requested_at=null where id=t.id;
 else
  update public.teams set plan_period_ends_at=private.next_team_plan_period(t.plan_activated_at,now()) where id=t.id;
 end if;
end;
$$;


ALTER FUNCTION private.renew_team_plan(target_team uuid) OWNER TO postgres;

--
-- Name: stop_deleted_player_licences(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.stop_deleted_player_licences() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare l record;
begin
 for l in select pl.id from private.player_licences pl join private.player_identities i on i.id=pl.identity_id where i.profile_id=old.id order by pl.id loop
  perform private.refresh_player_licence(l.id);
  update private.player_licences set stop_at=current_period_end where id=l.id and activated_at is not null;
  insert into private.licence_events(licence_id,action) values(l.id,'cancel_at_period_end');
 end loop;return old;
end;$$;


ALTER FUNCTION private.stop_deleted_player_licences() OWNER TO postgres;

--
-- Name: validate_ovr_assessment(); Type: FUNCTION; Schema: private; Owner: postgres
--

CREATE FUNCTION private.validate_ovr_assessment() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare policy private.ovr_models; expected text[]; k text; v jsonb;
begin
 select * into policy from private.ovr_models where version=new.model_version;
 if not found or not policy.approved then raise exception 'El modelo de OVR no está aprobado.' using errcode='22023';end if;
 if new.comparable_count<policy.minimum_cohort or new.participated_minutes<policy.minimum_minutes or new.participated_matches<policy.minimum_matches then raise exception 'Muestra o participación insuficiente para este modelo.' using errcode='22023';end if;
 if split_part(new.season_code,'/',2)::integer<>split_part(new.season_code,'/',1)::integer+1 then raise exception 'Temporada no válida.' using errcode='22023';end if;
 expected:=case when new.position_name='Portero' then array['POR','SEG','IMP','DIS','REG','EFI'] else array['FIN','CRE','IMP','DIS','REG','EFI'] end;
 if jsonb_typeof(new.attributes)<>'object' or (select count(*) from jsonb_object_keys(new.attributes))<>6 then raise exception 'La Card necesita seis atributos reales.' using errcode='22023';end if;
 foreach k in array expected loop
  v:=new.attributes->k;
  if v is null or jsonb_typeof(v)<>'number' then raise exception 'Atributo ausente o no numérico.' using errcode='22023';end if;
  if v::text::numeric not between 0 and 99 or trunc(v::text::numeric)<>v::text::numeric then raise exception 'Los atributos deben ser enteros de 0 a 99.' using errcode='22023';end if;
 end loop;
 return new;
end;$$;


ALTER FUNCTION private.validate_ovr_assessment() OWNER TO postgres;

--
-- Name: admin_delete_hierarchy(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_delete_hierarchy(target_kind text, target_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if not private.has_permission('platform.manage') then
  raise exception 'Solo el superadmin puede eliminar registros.' using errcode='42501';
 end if;
 if target_kind='club' then
  perform 1 from public.clubs where id=target_id for update;
  if not found then raise exception 'El club ya no existe.'; end if;
  if exists(select 1 from public.teams where club_id=target_id) then
   raise exception 'Elimina primero los equipos del club.';
  end if;
  delete from public.clubs where id=target_id;
 elsif target_kind='team' then
  perform 1 from public.teams where id=target_id for update;
  if not found then raise exception 'El equipo ya no existe.'; end if;
  if exists(select 1 from public.team_members where team_id=target_id) then
   raise exception 'Elimina primero los entrenadores y jugadores del equipo.';
  end if;
  delete from public.teams where id=target_id;
 elsif target_kind in ('coach','player') then
  if target_id=auth.uid() or exists(select 1 from public.user_roles where user_id=target_id and role_code not in ('coach','player')) then
   raise exception 'No puedes eliminar tu cuenta ni una cuenta con roles administrativos.' using errcode='42501';
  end if;
  perform 1 from public.profiles where id=target_id for update;
  if not found then raise exception 'La cuenta ya no existe.'; end if;
  if not exists(select 1 from public.user_roles where user_id=target_id and role_code=target_kind) then
   raise exception 'La cuenta no corresponde al tipo indicado.' using errcode='22023';
  end if;
  if exists(select 1 from public.team_members where coach_id=target_id) then
   raise exception 'Reasigna o elimina primero los jugadores de este entrenador.';
  end if;
  -- Explicit confirmation in the UI states this removes the account in all teams.
  -- Supabase Storage may reject deletion of owners; its objects must then be
  -- removed using the Storage API, never by deleting storage metadata with SQL.
  delete from auth.users where id=target_id;
 else
  raise exception 'Tipo de registro no válido.' using errcode='22023';
 end if;
end;
$$;


ALTER FUNCTION public.admin_delete_hierarchy(target_kind text, target_id uuid) OWNER TO postgres;

--
-- Name: admin_save_club(text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_save_club(club_name text, target_club uuid DEFAULT NULL::uuid, selected_plan uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare saved_id uuid;
begin
 if not private.has_permission('platform.manage') then
  raise insufficient_privilege using message = 'Global administrator required';
 end if;
 if target_club is null then
  insert into public.clubs(name) values(trim(club_name)) returning id into saved_id;
 else
  update public.clubs set name=trim(club_name) where id=target_club returning id into saved_id;
  if saved_id is null then raise exception 'Club not found'; end if;
 end if;
 if selected_plan is not null then
  insert into public.club_subscriptions(club_id,plan_id) values(saved_id,selected_plan)
  on conflict(club_id) do update set plan_id=excluded.plan_id;
 end if;
 return saved_id;
end;
$$;


ALTER FUNCTION public.admin_save_club(club_name text, target_club uuid, selected_plan uuid) OWNER TO postgres;

--
-- Name: attach_club_photo(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.attach_club_photo(target_club uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if not private.has_permission('members.manage',target_club) then raise exception 'No puedes modificar la foto de este club.' using errcode='42501';end if;
 if not exists(select 1 from storage.objects where bucket_id='club-photos' and name=target_club::text||'/portrait') then raise exception 'Primero sube la foto del club.' using errcode='22023';end if;
 update public.clubs set photo_path=target_club::text||'/portrait' where id=target_club;
end;
$$;


ALTER FUNCTION public.attach_club_photo(target_club uuid) OWNER TO postgres;

--
-- Name: attach_profile_photo(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.attach_profile_photo(target_user uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if not private.can_manage_photo(target_user) then raise exception 'No puedes modificar esta foto.' using errcode='42501'; end if;
 if not exists(select 1 from storage.objects where bucket_id='profile-photos' and name=target_user::text||'/portrait') then raise exception 'Primero sube la foto.' using errcode='22023'; end if;
 update public.profiles set photo_path=target_user::text||'/portrait' where id=target_user;
end;
$$;


ALTER FUNCTION public.attach_profile_photo(target_user uuid) OWNER TO postgres;

--
-- Name: can_create_account(text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.can_create_account(kind text, target_club uuid DEFAULT NULL::uuid, target_team uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select private.can_provision((select auth.uid()),kind,target_club,target_team);
$$;


ALTER FUNCTION public.can_create_account(kind text, target_club uuid, target_team uuid) OWNER TO postgres;

--
-- Name: can_edit_coach_name(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.can_edit_coach_name(target_coach uuid, target_team uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select exists(select 1 from public.team_members tm where tm.team_id=target_team and tm.user_id=target_coach and tm.role_code='coach'
 and (private.has_permission('members.manage',tm.club_id) or private.is_team_admin(tm.team_id) or private.is_team_coach(tm.team_id)));
$$;


ALTER FUNCTION public.can_edit_coach_name(target_coach uuid, target_team uuid) OWNER TO postgres;

--
-- Name: can_edit_player(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.can_edit_player(target_player uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select exists(select 1 from public.user_roles where user_id=target_player and role_code='player') and (
 private.has_permission('platform.manage',null)
 or exists(select 1 from public.user_roles ur where ur.user_id=target_player and ur.role_code='player' and private.has_permission('members.manage',ur.club_id))
 or exists(select 1 from public.team_members tm where tm.user_id=target_player and tm.role_code='player' and (
 private.is_team_admin(tm.team_id) or (tm.coach_id=auth.uid() and private.is_team_coach(tm.team_id)))))
$$;


ALTER FUNCTION public.can_edit_player(target_player uuid) OWNER TO postgres;

--
-- Name: club_licence_periods(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.club_licence_periods(target_club uuid, range_start timestamp with time zone, range_end timestamp with time zone) RETURNS TABLE(permanent_id uuid, player_name text, period_start timestamp with time zone, period_end timestamp with time zone, price_cents integer, club_share_cents integer, oncex_share_cents integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare l record;
begin
 if not private.has_permission('members.manage',target_club) then raise exception 'No puedes consultar la facturación de este club.' using errcode='42501';end if;
 if range_start is null or range_end is null or range_end<=range_start or range_end>range_start+interval '1 year' then raise exception 'Selecciona un intervalo válido de hasta un año.' using errcode='22023';end if;
 for l in select id from private.player_licences where club_id=target_club order by id loop perform private.refresh_player_licence(l.id);end loop;
 return query select i.id,i.player_name,p.starts_at,p.ends_at,p.reference_price_cents,p.club_share_cents,p.oncex_share_cents
 from private.licence_periods p join private.player_licences pl on pl.id=p.licence_id join private.player_identities i on i.id=pl.identity_id
 where pl.club_id=target_club and p.starts_at>=range_start and p.starts_at<range_end order by p.starts_at,i.id;
end;$$;


ALTER FUNCTION public.club_licence_periods(target_club uuid, range_start timestamp with time zone, range_end timestamp with time zone) OWNER TO postgres;

--
-- Name: club_player_rankings(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.club_player_rankings(target_club uuid) RETURNS TABLE(player_id uuid, full_name text, player_position text, team_id uuid, team_name text, category text, oncex_score numeric, photo_path text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select p.id,p.full_name,p.position,t.id,t.name,t.category,p.oncex_score,p.photo_path
 from public.team_members tm join public.profiles p on p.id=tm.user_id join public.teams t on t.id=tm.team_id
 where tm.role_code='player' and tm.club_id=target_club and private.has_permission('clubs.read',target_club)
 order by p.oncex_score desc nulls last,p.full_name,p.id,t.name,t.id;
$$;


ALTER FUNCTION public.club_player_rankings(target_club uuid) OWNER TO postgres;

--
-- Name: confirm_match_statistics(uuid, integer, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.confirm_match_statistics(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare m public.team_matches; entry jsonb; slot uuid; mins integer; seen uuid[]:='{}'; count_starters integer; player_record public.match_players;
begin
 select * into m from public.team_matches where id=target_match for update;
 if not found or not private.can_manage_match_team(m.team_id) then raise exception 'No puedes registrar estadísticas de este partido.' using errcode='42501';end if;
 if exists(select 1 from public.match_players mp where mp.match_id=m.id and (mp.player_id is null or not exists(select 1 from public.team_members tm where tm.team_id=m.team_id and tm.role_code='player' and tm.user_id=mp.player_id))) then raise exception 'La plantilla ha cambiado. Revisa y guarda de nuevo los 11 titulares.' using errcode='22023';end if;
 if m.status<>'draft' then raise exception 'El partido ya está confirmado.' using errcode='22023';end if;
 select count(*) into count_starters from public.match_players where match_id=m.id and starter;
 if count_starters<>11 then raise exception 'No puedes registrar estadísticas sin los 11 titulares.' using errcode='22023';end if;
 if team_goals is null or opponent_goals is null or team_goals not between 0 and 99 or opponent_goals not between 0 and 99 then raise exception 'Introduce un resultado válido.' using errcode='22023';end if;
 if performances is null or jsonb_typeof(performances)<>'array' then raise exception 'Completa las actuaciones de toda la alineación.' using errcode='22023';end if;
 for entry in select value from jsonb_array_elements(performances) loop
  slot:=(entry->>'slot_id')::uuid;mins:=(entry->>'minutes')::integer;
  if slot is null or slot=any(seen) or not exists(select 1 from public.match_players where match_id=m.id and slot_id=slot) then raise exception 'Jugador duplicado o ajeno a esta alineación.' using errcode='22023';end if;
  if mins is null or mins<0 or mins>m.duration then raise exception 'Indica los minutos jugados de cada titular y suplente.' using errcode='22023';end if;
  -- Nonparticipants must not acquire actions from play.
  if mins=0 and (coalesce((entry->>'goals')::integer,0)>0 or coalesce((entry->>'assists')::integer,0)>0 or coalesce((entry->>'own_goals')::integer,0)>0) then
   raise exception 'Un jugador con acciones de juego debe tener minutos registrados.' using errcode='22023';end if;
  update public.match_players set minutes=mins,goals=coalesce((entry->>'goals')::integer,0),own_goals=coalesce((entry->>'own_goals')::integer,0),assists=coalesce((entry->>'assists')::integer,0),yellow_cards=coalesce((entry->>'yellow_cards')::integer,0),red_cards=coalesce((entry->>'red_cards')::integer,0),clean_sheet=(opponent_goals=0 and mins>=60) where slot_id=slot;
  seen:=array_append(seen,slot);
 end loop;
 if cardinality(seen)<>(select count(*) from public.match_players where match_id=m.id) then raise exception 'Faltan minutos o actuaciones de jugadores de la alineación.' using errcode='22023';end if;
 if (select coalesce(sum(goals),0) from public.match_players where match_id=m.id)>team_goals then raise exception 'Los goles de jugadores no pueden superar el resultado del equipo.' using errcode='22023';end if;
 if (select coalesce(sum(minutes),0) from public.match_players where match_id=m.id)>11*m.duration then raise exception 'La suma de minutos supera los disponibles para 11 jugadores.' using errcode='22023';end if;
 if (select coalesce(sum(own_goals),0) from public.match_players where match_id=m.id)>opponent_goals then raise exception 'Los goles en propia superan los goles del rival.' using errcode='22023';end if;
 if (select coalesce(sum(assists),0) from public.match_players where match_id=m.id)>team_goals then raise exception 'Las asistencias no pueden superar los goles del equipo.' using errcode='22023';end if;
 -- Lock profiles in a consistent order, so simultaneous match confirmations
 -- cannot lose points or overwrite a newer total.
 perform 1 from public.profiles where id in(select player_id from public.match_players where match_id=m.id) order by id for update;
 for player_record in select * from public.match_players where match_id=m.id loop
  update public.match_players set oncex_points=private.oncex_match_points(player_record.player_position,player_record.minutes,player_record.goals,player_record.own_goals,player_record.assists,player_record.yellow_cards,player_record.red_cards,player_record.clean_sheet) where slot_id=player_record.slot_id;
 end loop;
 update public.team_matches set goals_for=team_goals,goals_against=opponent_goals,status='confirmed' where id=m.id;
 update public.profiles p set oncex_score=(select coalesce(sum(mp.oncex_points),0) from public.match_players mp join public.team_matches finished on finished.id=mp.match_id where mp.player_id=p.id and finished.status='confirmed') where p.id in(select player_id from public.match_players where match_id=m.id);
end;
$$;


ALTER FUNCTION public.confirm_match_statistics(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb) OWNER TO postgres;

--
-- Name: confirm_match_statistics_v2(uuid, integer, integer, jsonb, integer, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.confirm_match_statistics_v2(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb, expected_revision integer, match_season text, correction_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare m public.team_matches; entry jsonb; slot uuid; mins integer; seen uuid[]:='{}'; count_starters integer; player_record public.match_players; conceded integer; breakdown jsonb; previous_snapshot jsonb;
begin
 select * into m from public.team_matches where id=target_match for update;
 if not found or not private.can_manage_match_team(m.team_id) then raise exception 'No puedes registrar estadísticas de este partido.' using errcode='42501';end if;
 if expected_revision is null or expected_revision<>m.revision then raise exception 'El partido ha cambiado. Recárgalo antes de guardar.' using errcode='40001';end if;
 if match_season is null or match_season !~ '^[0-9]{4}/[0-9]{4}$' or split_part(match_season,'/',2)::integer<>split_part(match_season,'/',1)::integer+1 then raise exception 'Indica la temporada, por ejemplo 2026/2027.' using errcode='22023';end if;
 if m.status='confirmed' and (correction_reason is null or length(trim(correction_reason))<8) then raise exception 'Indica el motivo de la corrección oficial (mínimo 8 caracteres).' using errcode='22023';end if;
 previous_snapshot:=jsonb_build_object('match',to_jsonb(m),'players',(select jsonb_agg(to_jsonb(mp)) from public.match_players mp where mp.match_id=m.id));
 if m.status='draft' and exists(select 1 from public.match_players mp where mp.match_id=m.id and (mp.player_id is null or not exists(select 1 from public.team_members tm where tm.team_id=m.team_id and tm.role_code='player' and tm.user_id=mp.player_id))) then raise exception 'La plantilla ha cambiado. Revisa y guarda de nuevo los 11 titulares.' using errcode='22023';end if;
 select count(*) into count_starters from public.match_players where match_id=m.id and starter;
 if count_starters<>11 then raise exception 'No puedes registrar estadísticas sin los 11 titulares.' using errcode='22023';end if;
 if team_goals is null or opponent_goals is null or team_goals not between 0 and 99 or opponent_goals not between 0 and 99 then raise exception 'Introduce un resultado válido.' using errcode='22023';end if;
 if performances is null or jsonb_typeof(performances)<>'array' then raise exception 'Completa las actuaciones de toda la alineación.' using errcode='22023';end if;
 for entry in select value from jsonb_array_elements(performances) loop
  slot:=(entry->>'slot_id')::uuid;mins:=(entry->>'minutes')::integer;
  if slot is null or slot=any(seen) or not exists(select 1 from public.match_players where match_id=m.id and slot_id=slot) then raise exception 'Jugador duplicado o ajeno a esta alineación.' using errcode='22023';end if;
  if mins is null or mins<0 or mins>m.duration then raise exception 'Indica los minutos jugados de cada titular y suplente.' using errcode='22023';end if;
  conceded:=case when opponent_goals=0 then 0 else (entry->>'conceded_while_playing')::integer end;
  if conceded is null or conceded<0 or conceded>opponent_goals or (mins=0 and conceded<>0) or (mins=m.duration and conceded<>opponent_goals) then raise exception 'Indica los goles encajados mientras jugaba cada jugador. Quien juega todo el partido debe registrar todos los goles del rival.' using errcode='22023';end if;
  -- Nonparticipants must not acquire actions from play.
  if mins=0 and (coalesce((entry->>'goals')::integer,0)>0 or coalesce((entry->>'assists')::integer,0)>0 or coalesce((entry->>'own_goals')::integer,0)>0) then
   raise exception 'Un jugador con acciones de juego debe tener minutos registrados.' using errcode='22023';end if;
  update public.match_players set minutes=mins,goals=coalesce((entry->>'goals')::integer,0),own_goals=coalesce((entry->>'own_goals')::integer,0),assists=coalesce((entry->>'assists')::integer,0),yellow_cards=coalesce((entry->>'yellow_cards')::integer,0),red_cards=coalesce((entry->>'red_cards')::integer,0),conceded_while_playing=conceded,clean_sheet=(conceded=0 and mins>=ceil(m.duration*0.6)) where slot_id=slot;
  seen:=array_append(seen,slot);
 end loop;
 if cardinality(seen)<>(select count(*) from public.match_players where match_id=m.id) then raise exception 'Faltan minutos o actuaciones de jugadores de la alineación.' using errcode='22023';end if;
 if (select coalesce(sum(goals),0) from public.match_players where match_id=m.id)<>team_goals then raise exception 'Los goles registrados de los jugadores deben coincidir exactamente con el marcador del club.' using errcode='22023';end if;
 if (select coalesce(sum(minutes),0) from public.match_players where match_id=m.id)>11*m.duration then raise exception 'La suma de minutos supera los disponibles para 11 jugadores.' using errcode='22023';end if;
 if (select coalesce(sum(own_goals),0) from public.match_players where match_id=m.id)>opponent_goals then raise exception 'Los goles en propia superan los goles del rival.' using errcode='22023';end if;
 if (select coalesce(sum(assists),0) from public.match_players where match_id=m.id)>team_goals then raise exception 'Las asistencias no pueden superar los goles del equipo.' using errcode='22023';end if;
 if exists(select 1 from public.match_players where match_id=m.id and assists>team_goals-goals) then raise exception 'Un jugador no puede tener más asistencias que goles marcados por sus compañeros.' using errcode='22023';end if;
 -- Lock profiles in a consistent order, so simultaneous match confirmations
 -- cannot lose points or overwrite a newer total.
 perform 1 from public.profiles where id in(select player_id from public.match_players where match_id=m.id) order by id for update;
 for player_record in select * from public.match_players where match_id=m.id loop
  breakdown:=private.oncex_points_v2(player_record.player_position,m.duration,player_record.minutes,player_record.goals,player_record.own_goals,player_record.assists,player_record.yellow_cards,player_record.red_cards,player_record.clean_sheet,team_goals,opponent_goals);
  update public.match_players set oncex_points=(breakdown->>'total')::numeric,points_breakdown=breakdown,scoring_version='oncex-match-v2' where slot_id=player_record.slot_id;
 end loop;
 update public.team_matches set goals_for=team_goals,goals_against=opponent_goals,status='confirmed',revision=revision+1,season_code=match_season where id=m.id;
 update public.profiles p set oncex_score=(select coalesce(sum(mp.oncex_points),0) from public.match_players mp join public.team_matches finished on finished.id=mp.match_id where mp.player_id=p.id and finished.status='confirmed') where p.id in(select player_id from public.match_players where match_id=m.id);
 insert into private.match_revisions(match_id,revision,actor,reason,before_data,after_data) values(m.id,m.revision+1,auth.uid(),case when m.status='draft' then 'Confirmación inicial' else trim(correction_reason) end,previous_snapshot,jsonb_build_object('match',(select to_jsonb(f) from public.team_matches f where f.id=m.id),'players',(select jsonb_agg(to_jsonb(mp)) from public.match_players mp where mp.match_id=m.id)));
end;
$_$;


ALTER FUNCTION public.confirm_match_statistics_v2(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb, expected_revision integer, match_season text, correction_reason text) OWNER TO postgres;

--
-- Name: confirm_match_statistics_v3(uuid, integer, integer, jsonb, integer, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.confirm_match_statistics_v3(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb, expected_revision integer, match_season text, match_venue text, correction_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare m public.team_matches; entry jsonb; slot uuid; mins integer; seen uuid[]:='{}'; count_starters integer; player_record public.match_players; conceded integer; breakdown jsonb; previous_snapshot jsonb;
begin
 select * into m from public.team_matches where id=target_match for update;
 if not found or not private.can_manage_match_team(m.team_id) then raise exception 'No puedes registrar estadísticas de este partido.' using errcode='42501';end if;
 if match_venue is null or match_venue not in ('home','away') then raise exception 'Indica si el club juega como local o visitante.' using errcode='22023';end if;
 if expected_revision is null or expected_revision<>m.revision then raise exception 'El partido ha cambiado. Recárgalo antes de guardar.' using errcode='40001';end if;
 if match_season is null or match_season !~ '^[0-9]{4}/[0-9]{4}$' or split_part(match_season,'/',2)::integer<>split_part(match_season,'/',1)::integer+1 then raise exception 'Indica la temporada, por ejemplo 2026/2027.' using errcode='22023';end if;
 if m.status='confirmed' and (correction_reason is null or length(trim(correction_reason))<8) then raise exception 'Indica el motivo de la corrección oficial (mínimo 8 caracteres).' using errcode='22023';end if;
 previous_snapshot:=jsonb_build_object('match',to_jsonb(m),'players',(select jsonb_agg(to_jsonb(mp)) from public.match_players mp where mp.match_id=m.id));
 if m.status='draft' and exists(select 1 from public.match_players mp where mp.match_id=m.id and (mp.player_id is null or not exists(select 1 from public.team_members tm where tm.team_id=m.team_id and tm.role_code='player' and tm.user_id=mp.player_id))) then raise exception 'La plantilla ha cambiado. Revisa y guarda de nuevo los 11 titulares.' using errcode='22023';end if;
 select count(*) into count_starters from public.match_players where match_id=m.id and starter;
 if count_starters<>11 then raise exception 'No puedes registrar estadísticas sin los 11 titulares.' using errcode='22023';end if;
 if team_goals is null or opponent_goals is null or team_goals not between 0 and 99 or opponent_goals not between 0 and 99 then raise exception 'Introduce un resultado válido.' using errcode='22023';end if;
 if performances is null or jsonb_typeof(performances)<>'array' then raise exception 'Completa las actuaciones de toda la alineación.' using errcode='22023';end if;
 for entry in select value from jsonb_array_elements(performances) loop
  slot:=(entry->>'slot_id')::uuid;mins:=(entry->>'minutes')::integer;
  if slot is null or slot=any(seen) or not exists(select 1 from public.match_players where match_id=m.id and slot_id=slot) then raise exception 'Jugador duplicado o ajeno a esta alineación.' using errcode='22023';end if;
  if mins is null or mins<0 or mins>m.duration then raise exception 'Indica los minutos jugados de cada titular y suplente.' using errcode='22023';end if;
  conceded:=case when opponent_goals=0 then 0 else (entry->>'conceded_while_playing')::integer end;
  if conceded is null or conceded<0 or conceded>opponent_goals or (mins=0 and conceded<>0) or (mins=m.duration and conceded<>opponent_goals) then raise exception 'Indica los goles encajados mientras jugaba cada jugador. Quien juega todo el partido debe registrar todos los goles del rival.' using errcode='22023';end if;
  -- Nonparticipants must not acquire actions from play.
  if mins=0 and (coalesce((entry->>'goals')::integer,0)>0 or coalesce((entry->>'assists')::integer,0)>0 or coalesce((entry->>'own_goals')::integer,0)>0) then
   raise exception 'Un jugador con acciones de juego debe tener minutos registrados.' using errcode='22023';end if;
  update public.match_players set minutes=mins,goals=coalesce((entry->>'goals')::integer,0),own_goals=coalesce((entry->>'own_goals')::integer,0),assists=coalesce((entry->>'assists')::integer,0),yellow_cards=coalesce((entry->>'yellow_cards')::integer,0),red_cards=coalesce((entry->>'red_cards')::integer,0),conceded_while_playing=conceded,clean_sheet=(conceded=0 and mins>=ceil(m.duration*0.6)) where slot_id=slot;
  seen:=array_append(seen,slot);
 end loop;
 if cardinality(seen)<>(select count(*) from public.match_players where match_id=m.id) then raise exception 'Faltan minutos o actuaciones de jugadores de la alineación.' using errcode='22023';end if;
 if (select coalesce(sum(goals),0) from public.match_players where match_id=m.id)<>team_goals then raise exception 'Los goles registrados de los jugadores deben coincidir exactamente con el marcador del club.' using errcode='22023';end if;
 if (select coalesce(sum(minutes),0) from public.match_players where match_id=m.id)>11*m.duration then raise exception 'La suma de minutos supera los disponibles para 11 jugadores.' using errcode='22023';end if;
 if (select coalesce(sum(own_goals),0) from public.match_players where match_id=m.id)>opponent_goals then raise exception 'Los goles en propia superan los goles del rival.' using errcode='22023';end if;
 if (select coalesce(sum(assists),0) from public.match_players where match_id=m.id)>team_goals then raise exception 'Las asistencias no pueden superar los goles del equipo.' using errcode='22023';end if;
 if exists(select 1 from public.match_players where match_id=m.id and assists>team_goals-goals) then raise exception 'Un jugador no puede tener más asistencias que goles marcados por sus compañeros.' using errcode='22023';end if;
 -- Lock profiles in a consistent order, so simultaneous match confirmations
 -- cannot lose points or overwrite a newer total.
 perform 1 from public.profiles where id in(select player_id from public.match_players where match_id=m.id) order by id for update;
 for player_record in select * from public.match_players where match_id=m.id loop
  breakdown:=private.oncex_points_v2(player_record.player_position,m.duration,player_record.minutes,player_record.goals,player_record.own_goals,player_record.assists,player_record.yellow_cards,player_record.red_cards,player_record.clean_sheet,team_goals,opponent_goals);
  breakdown:=jsonb_set(jsonb_set(jsonb_set(breakdown,'{version}','"oncex-match-v3"'),'{parts,awayWin}',to_jsonb(case when match_venue='away' and team_goals>opponent_goals and player_record.minutes>=60 then 1 else 0 end)),'{total}',to_jsonb((breakdown->>'total')::numeric+case when match_venue='away' and team_goals>opponent_goals and player_record.minutes>=60 then 1 else 0 end));
  update public.match_players set oncex_points=(breakdown->>'total')::numeric,points_breakdown=breakdown,scoring_version='oncex-match-v3' where slot_id=player_record.slot_id;
 end loop;
 update public.team_matches set goals_for=team_goals,goals_against=opponent_goals,status='confirmed',revision=revision+1,season_code=match_season,venue=match_venue where id=m.id;
 update public.profiles p set oncex_score=(select coalesce(sum(mp.oncex_points),0) from public.match_players mp join public.team_matches finished on finished.id=mp.match_id where mp.player_id=p.id and finished.status='confirmed') where p.id in(select player_id from public.match_players where match_id=m.id);
 insert into private.match_revisions(match_id,revision,actor,reason,before_data,after_data) values(m.id,m.revision+1,auth.uid(),case when m.status='draft' then 'Confirmación inicial' else trim(correction_reason) end,previous_snapshot,jsonb_build_object('match',(select to_jsonb(f) from public.team_matches f where f.id=m.id),'players',(select jsonb_agg(to_jsonb(mp)) from public.match_players mp where mp.match_id=m.id)));
end;
$_$;


ALTER FUNCTION public.confirm_match_statistics_v3(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb, expected_revision integer, match_season text, match_venue text, correction_reason text) OWNER TO postgres;

--
-- Name: get_team_plan(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_team_plan(target_team uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare t public.teams;
begin
 select * into t from public.teams where id=target_team;
 if not found or not (private.has_permission('members.manage',t.club_id) or private.is_team_admin(t.id) or exists(select 1 from public.team_members where team_id=t.id and user_id=auth.uid())) then raise exception 'No puedes consultar este equipo.' using errcode='42501';end if;
 perform private.renew_team_plan(target_team);
 select * into t from public.teams where id=target_team;
 return jsonb_build_object('current_plan',t.plan_code,'pending_plan',t.pending_plan_code,'period_ends_at',t.plan_period_ends_at,'activated_at',t.plan_activated_at);
end;
$$;


ALTER FUNCTION public.get_team_plan(target_team uuid) OWNER TO postgres;

--
-- Name: match_revision_history(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_revision_history(target_match uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if not exists(select 1 from public.team_matches m where m.id=target_match and private.can_manage_match_team(m.team_id)) then raise exception 'No puedes consultar las revisiones de este partido.' using errcode='42501';end if;
 return(select coalesce(jsonb_agg(to_jsonb(r) order by r.revision desc),'[]') from private.match_revisions r where r.match_id=target_match);
end;$$;


ALTER FUNCTION public.match_revision_history(target_match uuid) OWNER TO postgres;

--
-- Name: match_summary(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_summary(target_match uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare m public.team_matches;
begin
 select * into m from public.team_matches where id=target_match;
 if not found or not private.can_read_match_team(m.team_id) or (m.status='draft' and not private.can_manage_match_team(m.team_id)) then raise exception 'No tienes acceso a este partido.' using errcode='42501';end if;
 return jsonb_build_object('match',to_jsonb(m),'players',(select coalesce(jsonb_agg(to_jsonb(mp)||jsonb_build_object('photo_path',p.photo_path) order by mp.starter desc,mp.player_name),'[]') from public.match_players mp left join public.profiles p on p.id=mp.player_id where mp.match_id=m.id));
end;
$$;


ALTER FUNCTION public.match_summary(target_match uuid) OWNER TO postgres;

--
-- Name: player_match_totals(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.player_match_totals(target_player uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if target_player is null or (target_player is distinct from auth.uid() and not public.can_edit_player(target_player) and not exists(select 1 from public.team_members tm where tm.user_id=target_player and tm.role_code='player' and private.is_team_coach(tm.team_id))) then raise exception 'No tienes acceso a las estadísticas de este jugador.' using errcode='42501';end if;
 return (select jsonb_build_object('Partidos',count(*) filter(where mp.minutes>0),'Minutos',coalesce(sum(mp.minutes),0),'Goles',coalesce(sum(mp.goals),0),'Goles en propia',coalesce(sum(mp.own_goals),0),'Asistencias',coalesce(sum(mp.assists),0),'Amarillas',coalesce(sum(mp.yellow_cards),0),'Rojas',coalesce(sum(mp.red_cards),0),'Clean Sheets',case when count(mp.clean_sheet)=0 then null else count(*) filter(where mp.clean_sheet) end) from public.match_players mp join public.team_matches m on m.id=mp.match_id where mp.player_id=target_player and m.status='confirmed');
end;
$$;


ALTER FUNCTION public.player_match_totals(target_player uuid) OWNER TO postgres;

--
-- Name: player_ovr_evolution(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.player_ovr_evolution(target_player uuid, target_season text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare identity uuid; selected_season text; current_rating private.ovr_assessments; baseline_rating private.ovr_assessments; snapshots jsonb; eligible boolean:=false;
begin
 if target_player is null or (target_player is distinct from auth.uid() and not public.can_edit_player(target_player)) then raise exception 'No puedes consultar la evolución de este jugador.' using errcode='42501';end if;
 select id into identity from private.player_identities where profile_id=target_player;
 selected_season:=target_season;
 if selected_season is null then
  select m.season_code into selected_season from public.match_players mp join public.team_matches m on m.id=mp.match_id
  where mp.player_id=target_player and m.status='confirmed' and m.season_code is not null and m.played_on<=current_date order by m.played_on desc,m.id desc limit 1;
 end if;
 select * into current_rating from private.ovr_assessments where identity_id=identity and season_code=selected_season and model_version='oncex-card-v3' order by assessed_at desc,id desc limit 1;
 if current_rating.id is not null then
  select exists(
   select 1 from private.card_inputs(selected_season) candidate join private.ovr_models policy on policy.version='oncex-card-v3' and policy.approved
   where candidate.identity_id=identity and candidate.position_name=current_rating.position_name and candidate.category_key=current_rating.category_key
   and candidate.matches>=policy.minimum_matches and candidate.minutes>=policy.minimum_minutes
   and (select count(*) from private.card_inputs(selected_season) peer where peer.position_name=candidate.position_name and peer.category_key=candidate.category_key and peer.matches>=policy.minimum_matches and peer.minutes>=policy.minimum_minutes)>=policy.minimum_cohort
  ) into eligible;
 end if;
 select * into baseline_rating from private.ovr_assessments where identity_id=identity and season_code=selected_season and model_version='oncex-card-v3' order by assessed_at,id limit 1;
 select coalesce(jsonb_agg(jsonb_build_object('month',s.month,'overall',s.overall,'model_version',s.model_version) order by s.month),'[]') into snapshots from private.ovr_monthly_snapshots s where s.identity_id=identity and s.season_code=selected_season;
 return jsonb_build_object('season',selected_season,'status',case when eligible then 'ready' else 'insufficient_sample' end,
 'baseline',case when baseline_rating.id is not null then jsonb_build_object('overall',baseline_rating.overall,'assessed_at',baseline_rating.assessed_at) else null end,
 'current',case when eligible then jsonb_build_object('overall',current_rating.overall,'assessed_at',current_rating.assessed_at,'model_version',current_rating.model_version,'attributes',current_rating.attributes,'position',current_rating.position_name,'reliability',current_rating.reliability,'comparable_count',current_rating.comparable_count) else null end,'snapshots',snapshots);
end;$$;


ALTER FUNCTION public.player_ovr_evolution(target_player uuid, target_season text) OWNER TO postgres;

--
-- Name: player_season_points(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.player_season_points(target_player uuid, target_season text) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if target_player is distinct from auth.uid() and not public.can_edit_player(target_player) then raise exception 'No puedes consultar este jugador.' using errcode='42501';end if;
 return(select coalesce(sum(p.oncex_points),0) from public.match_players p join public.team_matches m on m.id=p.match_id where p.player_id=target_player and m.status='confirmed' and m.season_code=target_season);
end;$$;


ALTER FUNCTION public.player_season_points(target_player uuid, target_season text) OWNER TO postgres;

--
-- Name: provision_account(uuid, uuid, text, text, uuid, uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.provision_account(actor uuid, new_user uuid, kind text, entity_name text, target_club uuid DEFAULT NULL::uuid, target_team uuid DEFAULT NULL::uuid, team_category text DEFAULT ''::text, assigned_coach uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare saved_club uuid:=target_club; saved_team uuid:=target_team; assigned_role text;
begin
 if not private.can_provision(actor,kind,target_club,target_team) then
  raise insufficient_privilege using message='Account creation outside caller scope';
 end if;
 if length(trim(entity_name)) not between 1 and 120 then raise check_violation using message='Invalid name'; end if;
 -- The account must have been freshly created by this request, with only its default role.
 if not exists(select 1 from public.profiles where id=new_user)
 or exists(select 1 from public.user_roles where user_id=new_user and (role_code<>'player' or club_id is not null)) then
  raise check_violation using message='Expected a new account';
 end if;
 if kind='club' then
  insert into public.clubs(name) values(trim(entity_name)) returning id into saved_club;
  saved_team:=null; assigned_role:='club_admin';
 elsif kind='team' then
  if not exists(select 1 from public.clubs where id=target_club) or length(trim(team_category))=0 then raise check_violation using message='Invalid club or category'; end if;
  insert into public.teams(club_id,name,category) values(target_club,trim(entity_name),trim(team_category)) returning id into saved_team;
  assigned_role:='team_admin';
 else
  if not exists(select 1 from public.teams where id=target_team and club_id=target_club) then raise check_violation using message='Invalid team/club'; end if;
  if kind='player' then
   if not exists(select 1 from public.team_members where team_id=target_team and user_id=assigned_coach and role_code='coach') then
    raise check_violation using message='Select a coach of this team';
   end if;
   if exists(select 1 from public.team_members where team_id=target_team and user_id=actor and role_code='coach')
    and actor<>assigned_coach
    and not exists(select 1 from public.user_roles where user_id=actor and ((role_code='super_admin' and club_id is null) or (role_code='club_admin' and club_id=target_club)))
    and not exists(select 1 from public.team_members where team_id=target_team and user_id=actor and role_code='team_admin') then
    raise insufficient_privilege using message='Coach can only create their own players';
   end if;
  end if;
  assigned_role:=case when kind='coach' then 'coach' else 'player' end;
 end if;
 -- Record the verified operator, not the service-role identity, in audit triggers.
 perform set_config('request.jwt.claim.sub',actor::text,true);
 update public.profiles set full_name=trim(entity_name) where id=new_user;
 delete from public.user_roles where user_id=new_user and role_code='player' and club_id is null;
 insert into public.user_roles(user_id,role_code,club_id) values(new_user,assigned_role,saved_club);
 if saved_team is not null then
  insert into public.team_members(team_id,club_id,user_id,role_code,coach_id) values(saved_team,saved_club,new_user,assigned_role,case when kind='player' then assigned_coach else null end);
 end if;
 return jsonb_build_object('club_id',saved_club,'team_id',saved_team,'user_id',new_user,'role',assigned_role);
end;
$$;


ALTER FUNCTION public.provision_account(actor uuid, new_user uuid, kind text, entity_name text, target_club uuid, target_team uuid, team_category text, assigned_coach uuid) OWNER TO postgres;

--
-- Name: recover_player_identity(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recover_player_identity(permanent_id uuid, target_player uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare existing_id uuid;
begin
 if not private.has_permission('platform.manage') then raise exception 'Solo el superadmin puede recuperar identidades.' using errcode='42501';end if;
 perform 1 from private.player_identities where id=permanent_id and profile_id is null for update;
 if not found then raise exception 'La identidad no existe o sigue vinculada.';end if;
 if not exists(select 1 from public.team_members where user_id=target_player and role_code='player') then raise exception 'La cuenta destino debe ser un jugador.';end if;
 select id into existing_id from private.player_identities where profile_id=target_player for update;
 if exists(select 1 from private.player_licences where identity_id=existing_id) then raise exception 'La cuenta destino ya tiene historial de licencias. Requiere revisión administrativa.';end if;
 delete from private.player_identities where id=existing_id;
 update private.player_identities set profile_id=target_player,recovery_email=(select lower(trim(email)) from auth.users where id=target_player) where id=permanent_id;
end;$$;


ALTER FUNCTION public.recover_player_identity(permanent_id uuid, target_player uuid) OWNER TO postgres;

--
-- Name: rename_coach(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rename_coach(target_coach uuid, target_team uuid, coach_name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if not public.can_edit_coach_name(target_coach,target_team) then raise exception 'No puedes editar este entrenador.' using errcode='42501';end if;
 if coach_name is null or length(trim(coach_name)) not between 1 and 120 then raise exception 'Introduce un nombre de entre 1 y 120 caracteres.' using errcode='22023';end if;
 update public.profiles set full_name=trim(coach_name) where id=target_coach;
end;
$$;


ALTER FUNCTION public.rename_coach(target_coach uuid, target_team uuid, coach_name text) OWNER TO postgres;

--
-- Name: save_match_lineup(uuid, uuid, text, date, integer, uuid[], uuid[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.save_match_lineup(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], substitute_ids uuid[] DEFAULT '{}'::uuid[]) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


ALTER FUNCTION public.save_match_lineup(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], substitute_ids uuid[]) OWNER TO postgres;

--
-- Name: save_match_lineup_v2(uuid, uuid, text, date, integer, uuid[], text, uuid[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.save_match_lineup_v2(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], match_venue text, substitute_ids uuid[] DEFAULT '{}'::uuid[]) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare saved uuid;
begin
 if match_venue is null or match_venue not in ('home','away') then raise exception 'Indica si el club juega como local o visitante.' using errcode='22023';end if;
 saved:=public.save_match_lineup(target_team,target_match,opponent_name,match_date,match_duration,starter_ids,substitute_ids);
 update public.team_matches set venue=match_venue where id=saved;
 return saved;
end;$$;


ALTER FUNCTION public.save_match_lineup_v2(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], match_venue text, substitute_ids uuid[]) OWNER TO postgres;

--
-- Name: schedule_team_plan(uuid, text, text, timestamp with time zone, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.schedule_team_plan(target_team uuid, new_plan text, expected_plan text, expected_period_end timestamp with time zone, confirmed boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare t public.teams;
begin
 if confirmed is distinct from true then raise exception 'Debes confirmar el cambio de plan.' using errcode='22023';end if;
 if new_plan is null or new_plan not in ('basic','pro') then raise exception 'Plan no válido.' using errcode='22023';end if;
 select * into t from public.teams where id=target_team for update;
 if not found or not (private.has_permission('members.manage',t.club_id) or private.is_team_coach(t.id)) then
  raise exception 'Solo los administradores o entrenadores asignados al equipo pueden cambiar su plan.' using errcode='42501';
 end if;
 if t.plan_code is distinct from expected_plan or t.plan_period_ends_at is distinct from expected_period_end or t.plan_period_ends_at<=now() then
  raise exception 'El periodo o el plan han cambiado. Recarga el plan y vuelve a confirmarlo.' using errcode='40001';
 end if;
 update public.teams set pending_plan_code=case when new_plan=plan_code then null else new_plan end,
  plan_change_requested_at=case when new_plan=plan_code then null else now() end where id=target_team;
 return public.get_team_plan(target_team);
end;
$$;


ALTER FUNCTION public.schedule_team_plan(target_team uuid, new_plan text, expected_plan text, expected_period_end timestamp with time zone, confirmed boolean) OWNER TO postgres;

--
-- Name: set_player_licence(uuid, uuid, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_player_licence(target_player uuid, target_team uuid, activate boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare club uuid; identity uuid; l private.player_licences; action_name text;
begin
 if activate is null then raise exception 'Indica activar o dar de baja.' using errcode='22023';end if;
 select tm.club_id into club from public.team_members tm where tm.user_id=target_player and tm.team_id=target_team and tm.role_code='player';
 if club is null or not(private.has_permission('members.manage',club) or private.is_team_coach(target_team) or private.is_team_admin(target_team)) then raise exception 'No puedes gestionar esta licencia.' using errcode='42501';end if;
 identity:=private.ensure_player_identity(target_player);
 perform 1 from private.player_identities where id=identity for update;
 insert into private.player_licences(identity_id,club_id,club_name) select identity,club,name from public.clubs where id=club on conflict do nothing;
 select * into l from private.player_licences where identity_id=identity and club_id=club for update;
 perform private.refresh_player_licence(l.id);
 select * into l from private.player_licences where id=l.id;
 if activate then
  if l.activated_at is null or (l.stop_at is not null and l.stop_at<=now()) then
   update private.player_licences set activated_at=now(),current_period_end=now()+interval '1 month',stop_at=null where id=l.id;
   insert into private.licence_periods(licence_id,starts_at,ends_at) values(l.id,now(),now()+interval '1 month');
   action_name:='activate';
  elsif l.stop_at is not null then update private.player_licences set stop_at=null where id=l.id;action_name:='resume';
  else return;end if;
 else
  if l.activated_at is null or l.stop_at is not null then return;end if;
  update private.player_licences set stop_at=current_period_end where id=l.id;action_name:='cancel_at_period_end';
 end if;
 insert into private.licence_events(licence_id,action) values(l.id,action_name);
end;$$;


ALTER FUNCTION public.set_player_licence(target_player uuid, target_team uuid, activate boolean) OWNER TO postgres;

--
-- Name: set_player_score(uuid, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_player_score(target_player uuid, score numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if not public.can_edit_player(target_player) then
  raise exception 'No puedes evaluar a este jugador.' using errcode='42501';
 end if;
 if score is not null and (score < 0 or score > 100 or score::text in ('NaN','Infinity','-Infinity')) then
  raise exception 'La puntuación debe estar entre 0 y 100.' using errcode='22023';
 end if;
 update public.profiles set oncex_score=score where id=target_player;
end;
$$;


ALTER FUNCTION public.set_player_score(target_player uuid, score numeric) OWNER TO postgres;

--
-- Name: team_jersey_available(uuid, integer, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.team_jersey_available(target_team uuid, jersey integer, excluded_player uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare club uuid;
begin
 select club_id into club from public.teams where id=target_team;
 if club is null or not(private.has_permission('members.manage',club) or private.is_team_admin(target_team) or private.is_team_coach(target_team)) then raise exception 'No puedes consultar los dorsales de este equipo.' using errcode='42501';end if;
 if jersey is null or jersey not between 1 and 99 then raise exception 'El dorsal debe estar entre 1 y 99.' using errcode='22023';end if;
 return not exists(select 1 from public.team_members tm join public.profiles p on p.id=tm.user_id where tm.team_id=target_team and tm.role_code='player' and p.jersey_number=jersey and p.id is distinct from excluded_player);
end;$$;


ALTER FUNCTION public.team_jersey_available(target_team uuid, jersey integer, excluded_player uuid) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: team_matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    opponent text NOT NULL,
    played_on date NOT NULL,
    duration smallint NOT NULL,
    goals_for smallint,
    goals_against smallint,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revision integer DEFAULT 0 NOT NULL,
    season_code text,
    venue text,
    CONSTRAINT team_matches_check CHECK (((status = 'draft'::text) OR ((goals_for IS NOT NULL) AND (goals_against IS NOT NULL)))),
    CONSTRAINT team_matches_duration_check CHECK (((duration >= 1) AND (duration <= 150))),
    CONSTRAINT team_matches_goals_against_check CHECK (((goals_against >= 0) AND (goals_against <= 99))),
    CONSTRAINT team_matches_goals_for_check CHECK (((goals_for >= 0) AND (goals_for <= 99))),
    CONSTRAINT team_matches_opponent_check CHECK (((length(TRIM(BOTH FROM opponent)) >= 1) AND (length(TRIM(BOTH FROM opponent)) <= 120))),
    CONSTRAINT team_matches_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'confirmed'::text]))),
    CONSTRAINT team_matches_venue_check CHECK ((venue = ANY (ARRAY['home'::text, 'away'::text])))
);


ALTER TABLE public.team_matches OWNER TO postgres;

--
-- Name: team_match_list(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.team_match_list(target_team uuid) RETURNS SETOF public.team_matches
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
 if not private.can_read_match_team(target_team) then raise exception 'No tienes acceso a este equipo.' using errcode='42501';end if;
 return query select m.* from public.team_matches m where m.team_id=target_team and (m.status='confirmed' or private.can_manage_match_team(m.team_id)) order by m.played_on desc,m.created_at desc;
end;
$$;


ALTER FUNCTION public.team_match_list(target_team uuid) OWNER TO postgres;

--
-- Name: team_player_licences(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.team_player_licences(target_team uuid) RETURNS TABLE(player_id uuid, identity_id uuid, full_name text, active boolean, stops_at timestamp with time zone, period_ends_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare club uuid; l record;
begin
 select club_id into club from public.teams where id=target_team;
 if club is null or not(private.has_permission('members.manage',club) or private.is_team_coach(target_team) or private.is_team_admin(target_team)) then raise exception 'No puedes consultar estas licencias.' using errcode='42501';end if;
 for l in select pl.id from private.player_licences pl where pl.club_id=club order by pl.id loop perform private.refresh_player_licence(l.id);end loop;
 return query select p.id,i.id,p.full_name,coalesce(pl.activated_at is not null and (pl.stop_at is null or pl.stop_at>now()),false),pl.stop_at,pl.current_period_end
 from public.team_members tm join public.profiles p on p.id=tm.user_id join private.player_identities i on i.profile_id=p.id
 left join private.player_licences pl on pl.identity_id=i.id and pl.club_id=club
 where tm.team_id=target_team and tm.role_code='player' order by p.full_name,p.id;
end;$$;


ALTER FUNCTION public.team_player_licences(target_team uuid) OWNER TO postgres;

--
-- Name: viewer_club_plan(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.viewer_club_plan(target_club uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
 select case when private.has_permission('clubs.read',target_club) then 'oncex' else null end;
$$;


ALTER FUNCTION public.viewer_club_plan(target_club uuid) OWNER TO postgres;

--
-- Name: licence_events; Type: TABLE; Schema: private; Owner: postgres
--

CREATE TABLE private.licence_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    licence_id uuid NOT NULL,
    action text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    actor uuid DEFAULT auth.uid(),
    CONSTRAINT licence_events_action_check CHECK ((action = ANY (ARRAY['activate'::text, 'cancel_at_period_end'::text, 'resume'::text])))
);


ALTER TABLE private.licence_events OWNER TO postgres;

--
-- Name: licence_periods; Type: TABLE; Schema: private; Owner: postgres
--

CREATE TABLE private.licence_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    licence_id uuid NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    reference_price_cents integer DEFAULT 399 NOT NULL,
    club_share_cents integer DEFAULT 40 NOT NULL,
    oncex_share_cents integer DEFAULT 359 NOT NULL,
    CONSTRAINT licence_periods_check CHECK ((ends_at > starts_at)),
    CONSTRAINT licence_periods_club_share_cents_check CHECK ((club_share_cents = 40)),
    CONSTRAINT licence_periods_oncex_share_cents_check CHECK ((oncex_share_cents = 359)),
    CONSTRAINT licence_periods_reference_price_cents_check CHECK ((reference_price_cents = 399))
);


ALTER TABLE private.licence_periods OWNER TO postgres;

--
-- Name: match_revisions; Type: TABLE; Schema: private; Owner: postgres
--

CREATE TABLE private.match_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    revision integer NOT NULL,
    actor uuid,
    reason text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    before_data jsonb NOT NULL,
    after_data jsonb NOT NULL
);


ALTER TABLE private.match_revisions OWNER TO postgres;

--
-- Name: match_scoring_weights; Type: TABLE; Schema: private; Owner: postgres
--

CREATE TABLE private.match_scoring_weights (
    version text NOT NULL,
    position_name text NOT NULL,
    goal integer NOT NULL,
    own_goal integer NOT NULL,
    assist integer NOT NULL,
    yellow integer NOT NULL,
    red integer NOT NULL,
    clean_sheet integer NOT NULL
);


ALTER TABLE private.match_scoring_weights OWNER TO postgres;

--
-- Name: ovr_assessments; Type: TABLE; Schema: private; Owner: postgres
--

CREATE TABLE private.ovr_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identity_id uuid NOT NULL,
    season_code text NOT NULL,
    position_name text NOT NULL,
    category_key text NOT NULL,
    model_version text NOT NULL,
    assessed_at timestamp with time zone DEFAULT now() NOT NULL,
    data_cutoff timestamp with time zone NOT NULL,
    overall smallint NOT NULL,
    attributes jsonb NOT NULL,
    comparable_count integer NOT NULL,
    reliability numeric NOT NULL,
    participated_minutes integer NOT NULL,
    participated_matches integer NOT NULL,
    CONSTRAINT ovr_assessments_category_key_check CHECK ((length(TRIM(BOTH FROM category_key)) > 0)),
    CONSTRAINT ovr_assessments_check CHECK ((data_cutoff <= assessed_at)),
    CONSTRAINT ovr_assessments_comparable_count_check CHECK ((comparable_count >= 1)),
    CONSTRAINT ovr_assessments_overall_check CHECK (((overall >= 0) AND (overall <= 99))),
    CONSTRAINT ovr_assessments_participated_matches_check CHECK ((participated_matches >= 0)),
    CONSTRAINT ovr_assessments_participated_minutes_check CHECK ((participated_minutes >= 0)),
    CONSTRAINT ovr_assessments_position_name_check CHECK ((position_name = ANY (ARRAY['Portero'::text, 'Defensa'::text, 'Centrocampista'::text, 'Delantero'::text]))),
    CONSTRAINT ovr_assessments_reliability_check CHECK (((reliability >= (0)::numeric) AND (reliability <= (1)::numeric))),
    CONSTRAINT ovr_assessments_season_code_check CHECK ((season_code ~ '^[0-9]{4}/[0-9]{4}$'::text))
);


ALTER TABLE private.ovr_assessments OWNER TO postgres;

--
-- Name: ovr_category_mapping; Type: TABLE; Schema: private; Owner: postgres
--

CREATE TABLE private.ovr_category_mapping (
    team_category text NOT NULL,
    category_key text NOT NULL,
    CONSTRAINT ovr_category_mapping_category_key_check CHECK ((length(TRIM(BOTH FROM category_key)) > 0))
);


ALTER TABLE private.ovr_category_mapping OWNER TO postgres;

--
-- Name: ovr_models; Type: TABLE; Schema: private; Owner: postgres
--

CREATE TABLE private.ovr_models (
    version text NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    minimum_cohort integer NOT NULL,
    minimum_minutes integer NOT NULL,
    minimum_matches integer NOT NULL,
    specification jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ovr_models_minimum_cohort_check CHECK ((minimum_cohort >= 1)),
    CONSTRAINT ovr_models_minimum_matches_check CHECK ((minimum_matches >= 1)),
    CONSTRAINT ovr_models_minimum_minutes_check CHECK ((minimum_minutes >= 0))
);


ALTER TABLE private.ovr_models OWNER TO postgres;

--
-- Name: ovr_monthly_snapshots; Type: TABLE; Schema: private; Owner: postgres
--

CREATE TABLE private.ovr_monthly_snapshots (
    identity_id uuid NOT NULL,
    season_code text NOT NULL,
    month date NOT NULL,
    assessment_id uuid NOT NULL,
    overall smallint NOT NULL,
    attributes jsonb NOT NULL,
    model_version text NOT NULL,
    reliability numeric NOT NULL,
    comparable_count integer NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ovr_monthly_snapshots_month_check CHECK ((EXTRACT(day FROM month) = (1)::numeric)),
    CONSTRAINT ovr_monthly_snapshots_overall_check CHECK (((overall >= 0) AND (overall <= 99)))
);


ALTER TABLE private.ovr_monthly_snapshots OWNER TO postgres;

--
-- Name: player_identities; Type: TABLE; Schema: private; Owner: postgres
--

CREATE TABLE private.player_identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    recovery_email text NOT NULL,
    player_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE private.player_identities OWNER TO postgres;

--
-- Name: player_licences; Type: TABLE; Schema: private; Owner: postgres
--

CREATE TABLE private.player_licences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identity_id uuid NOT NULL,
    club_id uuid NOT NULL,
    club_name text NOT NULL,
    activated_at timestamp with time zone,
    current_period_end timestamp with time zone,
    stop_at timestamp with time zone,
    CONSTRAINT player_licences_check CHECK (((activated_at IS NULL) = (current_period_end IS NULL))),
    CONSTRAINT player_licences_check1 CHECK (((current_period_end IS NULL) OR (current_period_end > activated_at)))
);


ALTER TABLE private.player_licences OWNER TO postgres;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_log (
    id bigint NOT NULL,
    actor_id uuid,
    entity text NOT NULL,
    action text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT activity_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE public.activity_log OWNER TO postgres;

--
-- Name: activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.activity_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.activity_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: club_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.club_subscriptions (
    club_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT club_subscriptions_status_check CHECK ((status = ANY (ARRAY['trial'::text, 'active'::text, 'paused'::text, 'ended'::text])))
);


ALTER TABLE public.club_subscriptions OWNER TO postgres;

--
-- Name: clubs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clubs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    photo_path text,
    CONSTRAINT clubs_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120)))
);


ALTER TABLE public.clubs OWNER TO postgres;

--
-- Name: match_players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.match_players (
    match_id uuid NOT NULL,
    slot_id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid,
    player_name text NOT NULL,
    player_position text DEFAULT ''::text NOT NULL,
    starter boolean NOT NULL,
    minutes smallint,
    goals smallint DEFAULT 0 NOT NULL,
    own_goals smallint DEFAULT 0 NOT NULL,
    assists smallint DEFAULT 0 NOT NULL,
    yellow_cards smallint DEFAULT 0 NOT NULL,
    red_cards smallint DEFAULT 0 NOT NULL,
    clean_sheet boolean,
    oncex_points numeric(10,2),
    conceded_while_playing smallint,
    points_breakdown jsonb,
    scoring_version text DEFAULT 'oncex-match-v1'::text NOT NULL,
    CONSTRAINT match_players_assists_check CHECK (((assists >= 0) AND (assists <= 99))),
    CONSTRAINT match_players_conceded_while_playing_check CHECK (((conceded_while_playing >= 0) AND (conceded_while_playing <= 99))),
    CONSTRAINT match_players_goals_check CHECK (((goals >= 0) AND (goals <= 99))),
    CONSTRAINT match_players_minutes_check CHECK (((minutes >= 0) AND (minutes <= 150))),
    CONSTRAINT match_players_own_goals_check CHECK (((own_goals >= 0) AND (own_goals <= 99))),
    CONSTRAINT match_players_red_cards_check CHECK (((red_cards >= 0) AND (red_cards <= 1))),
    CONSTRAINT match_players_yellow_cards_check CHECK (((yellow_cards >= 0) AND (yellow_cards <= 2)))
);


ALTER TABLE public.match_players OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    code text NOT NULL,
    description text NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: photo_processing_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.photo_processing_settings (
    id boolean DEFAULT true NOT NULL,
    background_removal_enabled boolean DEFAULT true NOT NULL,
    CONSTRAINT photo_processing_settings_id_check CHECK (id)
);


ALTER TABLE public.photo_processing_settings OWNER TO postgres;

--
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    monthly_price_cents integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plans_monthly_price_cents_check CHECK ((monthly_price_cents >= 0)),
    CONSTRAINT plans_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120)))
);


ALTER TABLE public.plans OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "position" text DEFAULT ''::text NOT NULL,
    birth_date date,
    sporting_role text DEFAULT 'Jugador'::text NOT NULL,
    preferred_foot text DEFAULT ''::text NOT NULL,
    oncex_score numeric(12,2),
    photo_path text,
    jersey_number smallint,
    CONSTRAINT profiles_birth_date_check CHECK (((birth_date >= '1900-01-01'::date) AND (birth_date <= CURRENT_DATE))),
    CONSTRAINT profiles_jersey_number_check CHECK (((jersey_number >= 1) AND (jersey_number <= 99))),
    CONSTRAINT profiles_position_check CHECK ((length("position") <= 80)),
    CONSTRAINT profiles_preferred_foot_check CHECK ((preferred_foot = ANY (ARRAY[''::text, 'Derecho'::text, 'Izquierdo'::text, 'Ambos'::text]))),
    CONSTRAINT profiles_sporting_role_check CHECK ((sporting_role = ANY (ARRAY['Jugador'::text, 'Capitán'::text, 'Segundo capitán'::text])))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_code text NOT NULL,
    permission_code text NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    code text NOT NULL,
    name text NOT NULL,
    description text NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_members (
    team_id uuid NOT NULL,
    club_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_code text NOT NULL,
    coach_id uuid,
    CONSTRAINT team_members_role_code_check CHECK ((role_code = ANY (ARRAY['team_admin'::text, 'coach'::text, 'player'::text])))
);


ALTER TABLE public.team_members OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    name text NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    plan_code text DEFAULT 'basic'::text NOT NULL,
    plan_activated_at timestamp with time zone DEFAULT now() NOT NULL,
    plan_period_ends_at timestamp with time zone DEFAULT (now() + '1 mon'::interval) NOT NULL,
    pending_plan_code text,
    plan_change_requested_at timestamp with time zone,
    CONSTRAINT team_plan_period_valid CHECK ((plan_period_ends_at > plan_activated_at)),
    CONSTRAINT teams_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120))),
    CONSTRAINT teams_pending_plan_code_check CHECK ((pending_plan_code = ANY (ARRAY['basic'::text, 'pro'::text]))),
    CONSTRAINT teams_plan_code_check CHECK ((plan_code = ANY (ARRAY['basic'::text, 'pro'::text])))
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_code text NOT NULL,
    club_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT role_scope CHECK ((((role_code = 'super_admin'::text) AND (club_id IS NULL)) OR ((role_code = ANY (ARRAY['club_admin'::text, 'team_admin'::text, 'coach'::text])) AND (club_id IS NOT NULL)) OR (role_code = 'player'::text)))
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: licence_events licence_events_pkey; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.licence_events
    ADD CONSTRAINT licence_events_pkey PRIMARY KEY (id);


--
-- Name: licence_periods licence_periods_licence_id_starts_at_key; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.licence_periods
    ADD CONSTRAINT licence_periods_licence_id_starts_at_key UNIQUE (licence_id, starts_at);


--
-- Name: licence_periods licence_periods_pkey; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.licence_periods
    ADD CONSTRAINT licence_periods_pkey PRIMARY KEY (id);


--
-- Name: match_revisions match_revisions_match_id_revision_key; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.match_revisions
    ADD CONSTRAINT match_revisions_match_id_revision_key UNIQUE (match_id, revision);


--
-- Name: match_revisions match_revisions_pkey; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.match_revisions
    ADD CONSTRAINT match_revisions_pkey PRIMARY KEY (id);


--
-- Name: match_scoring_weights match_scoring_weights_pkey; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.match_scoring_weights
    ADD CONSTRAINT match_scoring_weights_pkey PRIMARY KEY (version, position_name);


--
-- Name: ovr_assessments ovr_assessments_pkey; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.ovr_assessments
    ADD CONSTRAINT ovr_assessments_pkey PRIMARY KEY (id);


--
-- Name: ovr_category_mapping ovr_category_mapping_pkey; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.ovr_category_mapping
    ADD CONSTRAINT ovr_category_mapping_pkey PRIMARY KEY (team_category);


--
-- Name: ovr_models ovr_models_pkey; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.ovr_models
    ADD CONSTRAINT ovr_models_pkey PRIMARY KEY (version);


--
-- Name: ovr_monthly_snapshots ovr_monthly_snapshots_pkey; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.ovr_monthly_snapshots
    ADD CONSTRAINT ovr_monthly_snapshots_pkey PRIMARY KEY (identity_id, season_code, month);


--
-- Name: player_identities player_identities_pkey; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.player_identities
    ADD CONSTRAINT player_identities_pkey PRIMARY KEY (id);


--
-- Name: player_identities player_identities_profile_id_key; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.player_identities
    ADD CONSTRAINT player_identities_profile_id_key UNIQUE (profile_id);


--
-- Name: player_identities player_identities_recovery_email_key; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.player_identities
    ADD CONSTRAINT player_identities_recovery_email_key UNIQUE (recovery_email);


--
-- Name: player_licences player_licences_identity_id_club_id_key; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.player_licences
    ADD CONSTRAINT player_licences_identity_id_club_id_key UNIQUE (identity_id, club_id);


--
-- Name: player_licences player_licences_pkey; Type: CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.player_licences
    ADD CONSTRAINT player_licences_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: club_subscriptions club_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.club_subscriptions
    ADD CONSTRAINT club_subscriptions_pkey PRIMARY KEY (club_id);


--
-- Name: clubs clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_pkey PRIMARY KEY (id);


--
-- Name: match_players match_players_match_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_match_id_player_id_key UNIQUE (match_id, player_id);


--
-- Name: match_players match_players_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_pkey PRIMARY KEY (slot_id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (code);


--
-- Name: photo_processing_settings photo_processing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photo_processing_settings
    ADD CONSTRAINT photo_processing_settings_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_code, permission_code);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (code);


--
-- Name: team_matches team_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_matches
    ADD CONSTRAINT team_matches_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (team_id, user_id, role_code);


--
-- Name: teams teams_id_club_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_id_club_id_key UNIQUE (id, club_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_club_id_role_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_club_id_role_code_key UNIQUE (user_id, club_id, role_code);


--
-- Name: ovr_assessment_history; Type: INDEX; Schema: private; Owner: postgres
--

CREATE INDEX ovr_assessment_history ON private.ovr_assessments USING btree (identity_id, season_code, assessed_at DESC);


--
-- Name: activity_log_recent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activity_log_recent_idx ON public.activity_log USING btree (created_at DESC, id DESC);


--
-- Name: team_matches_recent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX team_matches_recent ON public.team_matches USING btree (team_id, played_on DESC);


--
-- Name: team_members_coach_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX team_members_coach_idx ON public.team_members USING btree (team_id, coach_id) WHERE (role_code = 'player'::text);


--
-- Name: team_members_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX team_members_user_idx ON public.team_members USING btree (user_id, team_id);


--
-- Name: teams_club_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX teams_club_idx ON public.teams USING btree (club_id);


--
-- Name: user_roles_club_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_roles_club_idx ON public.user_roles USING btree (club_id, user_id);


--
-- Name: user_roles_global_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_roles_global_unique ON public.user_roles USING btree (user_id, role_code) WHERE (club_id IS NULL);


--
-- Name: ovr_assessments ovr_assessments_immutable; Type: TRIGGER; Schema: private; Owner: postgres
--

CREATE TRIGGER ovr_assessments_immutable BEFORE DELETE OR UPDATE ON private.ovr_assessments FOR EACH ROW EXECUTE FUNCTION private.keep_ovr_history();


--
-- Name: ovr_monthly_snapshots ovr_months_immutable; Type: TRIGGER; Schema: private; Owner: postgres
--

CREATE TRIGGER ovr_months_immutable BEFORE DELETE OR UPDATE ON private.ovr_monthly_snapshots FOR EACH ROW EXECUTE FUNCTION private.keep_ovr_history();


--
-- Name: ovr_assessments validate_real_ovr; Type: TRIGGER; Schema: private; Owner: postgres
--

CREATE TRIGGER validate_real_ovr BEFORE INSERT ON private.ovr_assessments FOR EACH ROW EXECUTE FUNCTION private.validate_ovr_assessment();


--
-- Name: match_players match_player_points_after_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER match_player_points_after_delete AFTER DELETE ON public.match_players FOR EACH ROW EXECUTE FUNCTION private.recalculate_deleted_match_player();


--
-- Name: club_subscriptions oncex_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER oncex_activity AFTER INSERT OR DELETE OR UPDATE ON public.club_subscriptions FOR EACH ROW EXECUTE FUNCTION private.record_activity();


--
-- Name: clubs oncex_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER oncex_activity AFTER INSERT OR DELETE OR UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION private.record_activity();


--
-- Name: plans oncex_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER oncex_activity AFTER INSERT OR DELETE OR UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION private.record_activity();


--
-- Name: profiles oncex_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER oncex_activity AFTER INSERT OR DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.record_activity();


--
-- Name: team_members oncex_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER oncex_activity AFTER INSERT OR DELETE OR UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION private.record_activity();


--
-- Name: teams oncex_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER oncex_activity AFTER INSERT OR DELETE OR UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION private.record_activity();


--
-- Name: user_roles oncex_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER oncex_activity AFTER INSERT OR DELETE OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION private.record_activity();


--
-- Name: profiles preserve_player_billing; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER preserve_player_billing BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.stop_deleted_player_licences();


--
-- Name: team_matches refresh_cards_after_confirmation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER refresh_cards_after_confirmation AFTER UPDATE OF status, revision, season_code ON public.team_matches FOR EACH ROW EXECUTE FUNCTION private.refresh_cards_after_match();


--
-- Name: team_members register_permanent_player; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER register_permanent_player AFTER INSERT OR UPDATE OF role_code, user_id ON public.team_members FOR EACH ROW EXECUTE FUNCTION private.register_player_identity();


--
-- Name: teams team_plan_management; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER team_plan_management BEFORE INSERT OR UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION private.check_team_plan();


--
-- Name: team_members unique_member_jersey; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER unique_member_jersey BEFORE INSERT OR UPDATE OF team_id, user_id, role_code ON public.team_members FOR EACH ROW EXECUTE FUNCTION private.check_member_jersey();


--
-- Name: profiles unique_player_jersey; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER unique_player_jersey BEFORE UPDATE OF jersey_number ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.check_player_jersey();


--
-- Name: licence_events licence_events_licence_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.licence_events
    ADD CONSTRAINT licence_events_licence_id_fkey FOREIGN KEY (licence_id) REFERENCES private.player_licences(id);


--
-- Name: licence_periods licence_periods_licence_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.licence_periods
    ADD CONSTRAINT licence_periods_licence_id_fkey FOREIGN KEY (licence_id) REFERENCES private.player_licences(id) ON DELETE RESTRICT;


--
-- Name: ovr_assessments ovr_assessments_identity_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.ovr_assessments
    ADD CONSTRAINT ovr_assessments_identity_id_fkey FOREIGN KEY (identity_id) REFERENCES private.player_identities(id) ON DELETE RESTRICT;


--
-- Name: ovr_assessments ovr_assessments_model_version_fkey; Type: FK CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.ovr_assessments
    ADD CONSTRAINT ovr_assessments_model_version_fkey FOREIGN KEY (model_version) REFERENCES private.ovr_models(version);


--
-- Name: ovr_monthly_snapshots ovr_monthly_snapshots_assessment_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.ovr_monthly_snapshots
    ADD CONSTRAINT ovr_monthly_snapshots_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES private.ovr_assessments(id);


--
-- Name: ovr_monthly_snapshots ovr_monthly_snapshots_identity_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.ovr_monthly_snapshots
    ADD CONSTRAINT ovr_monthly_snapshots_identity_id_fkey FOREIGN KEY (identity_id) REFERENCES private.player_identities(id) ON DELETE RESTRICT;


--
-- Name: player_identities player_identities_profile_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.player_identities
    ADD CONSTRAINT player_identities_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: player_licences player_licences_club_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.player_licences
    ADD CONSTRAINT player_licences_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE RESTRICT;


--
-- Name: player_licences player_licences_identity_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: postgres
--

ALTER TABLE ONLY private.player_licences
    ADD CONSTRAINT player_licences_identity_id_fkey FOREIGN KEY (identity_id) REFERENCES private.player_identities(id) ON DELETE RESTRICT;


--
-- Name: activity_log activity_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: club_subscriptions club_subscriptions_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.club_subscriptions
    ADD CONSTRAINT club_subscriptions_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: club_subscriptions club_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.club_subscriptions
    ADD CONSTRAINT club_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: match_players match_players_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.team_matches(id) ON DELETE CASCADE;


--
-- Name: match_players match_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_code_fkey FOREIGN KEY (permission_code) REFERENCES public.permissions(code) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_code_fkey FOREIGN KEY (role_code) REFERENCES public.roles(code) ON DELETE CASCADE;


--
-- Name: team_matches team_matches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_matches
    ADD CONSTRAINT team_matches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: team_matches team_matches_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_matches
    ADD CONSTRAINT team_matches_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: team_members team_members_profile_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_club_id_fkey FOREIGN KEY (team_id, club_id) REFERENCES public.teams(id, club_id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_club_id_role_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_club_id_role_code_fkey FOREIGN KEY (user_id, club_id, role_code) REFERENCES public.user_roles(user_id, club_id, role_code) ON DELETE CASCADE;


--
-- Name: teams teams_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_code_fkey FOREIGN KEY (role_code) REFERENCES public.roles(code);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: licence_events; Type: ROW SECURITY; Schema: private; Owner: postgres
--

ALTER TABLE private.licence_events ENABLE ROW LEVEL SECURITY;

--
-- Name: licence_periods; Type: ROW SECURITY; Schema: private; Owner: postgres
--

ALTER TABLE private.licence_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: match_revisions; Type: ROW SECURITY; Schema: private; Owner: postgres
--

ALTER TABLE private.match_revisions ENABLE ROW LEVEL SECURITY;

--
-- Name: match_scoring_weights; Type: ROW SECURITY; Schema: private; Owner: postgres
--

ALTER TABLE private.match_scoring_weights ENABLE ROW LEVEL SECURITY;

--
-- Name: ovr_assessments; Type: ROW SECURITY; Schema: private; Owner: postgres
--

ALTER TABLE private.ovr_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: ovr_category_mapping; Type: ROW SECURITY; Schema: private; Owner: postgres
--

ALTER TABLE private.ovr_category_mapping ENABLE ROW LEVEL SECURITY;

--
-- Name: ovr_models; Type: ROW SECURITY; Schema: private; Owner: postgres
--

ALTER TABLE private.ovr_models ENABLE ROW LEVEL SECURITY;

--
-- Name: ovr_monthly_snapshots; Type: ROW SECURITY; Schema: private; Owner: postgres
--

ALTER TABLE private.ovr_monthly_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: player_identities; Type: ROW SECURITY; Schema: private; Owner: postgres
--

ALTER TABLE private.player_identities ENABLE ROW LEVEL SECURITY;

--
-- Name: player_licences; Type: ROW SECURITY; Schema: private; Owner: postgres
--

ALTER TABLE private.player_licences ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_log activity_read_platform; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY activity_read_platform ON public.activity_log FOR SELECT TO authenticated USING (private.has_permission('platform.manage'::text));


--
-- Name: club_subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: clubs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

--
-- Name: clubs clubs_manage; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY clubs_manage ON public.clubs TO authenticated USING (private.has_permission('platform.manage'::text)) WITH CHECK (private.has_permission('platform.manage'::text));


--
-- Name: clubs clubs_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY clubs_read ON public.clubs FOR SELECT TO authenticated USING ((private.has_permission('platform.manage'::text) OR private.has_permission('clubs.read'::text, id)));


--
-- Name: match_players; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

--
-- Name: permissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: permissions permissions_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY permissions_read ON public.permissions FOR SELECT TO authenticated USING (true);


--
-- Name: photo_processing_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.photo_processing_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: photo_processing_settings photo_processing_settings_admin_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY photo_processing_settings_admin_read ON public.photo_processing_settings FOR SELECT TO authenticated USING (private.has_permission('platform.manage'::text));


--
-- Name: photo_processing_settings photo_processing_settings_admin_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY photo_processing_settings_admin_update ON public.photo_processing_settings FOR UPDATE TO authenticated USING (private.has_permission('platform.manage'::text)) WITH CHECK (private.has_permission('platform.manage'::text));


--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: plans plans_manage_platform; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY plans_manage_platform ON public.plans TO authenticated USING (private.has_permission('platform.manage'::text)) WITH CHECK (private.has_permission('platform.manage'::text));


--
-- Name: team_members player_coaches_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY player_coaches_read ON public.team_members FOR SELECT TO authenticated USING (((role_code = ANY (ARRAY['coach'::text, 'team_admin'::text])) AND private.is_team_player(team_id)));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (private.can_view_profile(id));


--
-- Name: profiles profiles_update_club_player; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_club_player ON public.profiles FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = profiles.id) AND (ur.role_code = 'player'::text) AND private.has_permission('members.manage'::text, ur.club_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = profiles.id) AND (ur.role_code = 'player'::text) AND private.has_permission('members.manage'::text, ur.club_id)))));


--
-- Name: profiles profiles_update_coach_player; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_coach_player ON public.profiles FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.user_id = profiles.id) AND (tm.role_code = 'player'::text) AND (tm.coach_id = ( SELECT auth.uid() AS uid)) AND private.is_team_coach(tm.team_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.user_id = profiles.id) AND (tm.role_code = 'player'::text) AND (tm.coach_id = ( SELECT auth.uid() AS uid)) AND private.is_team_coach(tm.team_id)))));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (((id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role_code <> 'player'::text)))))) WITH CHECK (((id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role_code <> 'player'::text))))));


--
-- Name: profiles profiles_update_platform; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_platform ON public.profiles FOR UPDATE TO authenticated USING (private.has_permission('platform.manage'::text)) WITH CHECK (private.has_permission('platform.manage'::text));


--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions role_permissions_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY role_permissions_read ON public.role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: roles roles_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY roles_read ON public.roles FOR SELECT TO authenticated USING (true);


--
-- Name: club_subscriptions subscriptions_manage_platform; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY subscriptions_manage_platform ON public.club_subscriptions TO authenticated USING (private.has_permission('platform.manage'::text)) WITH CHECK (private.has_permission('platform.manage'::text));


--
-- Name: profiles team_admin_profiles_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_admin_profiles_update ON public.profiles FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.user_id = profiles.id) AND private.is_team_admin(tm.team_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.user_id = profiles.id) AND private.is_team_admin(tm.team_id)))));


--
-- Name: team_members team_admin_roster_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_admin_roster_read ON public.team_members FOR SELECT TO authenticated USING (private.is_team_admin(team_id));


--
-- Name: team_matches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members team_members_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_members_delete ON public.team_members FOR DELETE TO authenticated USING (private.has_permission('teams.assign'::text, club_id));


--
-- Name: team_members team_members_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_members_insert ON public.team_members FOR INSERT TO authenticated WITH CHECK (private.has_permission('teams.assign'::text, club_id));


--
-- Name: team_members team_members_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_members_read ON public.team_members FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR private.has_permission('teams.assign'::text, club_id) OR private.is_team_coach(team_id)));


--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: teams teams_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_delete ON public.teams FOR DELETE TO authenticated USING (private.has_permission('teams.manage'::text, club_id));


--
-- Name: teams teams_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_insert ON public.teams FOR INSERT TO authenticated WITH CHECK (private.has_permission('teams.manage'::text, club_id));


--
-- Name: teams teams_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_read ON public.teams FOR SELECT TO authenticated USING ((private.has_permission('teams.manage'::text, club_id) OR (EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = teams.id) AND (tm.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: teams teams_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_update ON public.teams FOR UPDATE TO authenticated USING (private.has_permission('teams.manage'::text, club_id)) WITH CHECK (private.has_permission('teams.manage'::text, club_id));


--
-- Name: teams teams_update_assigned_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_update_assigned_admin ON public.teams FOR UPDATE TO authenticated USING (private.is_team_admin(id)) WITH CHECK ((private.is_team_admin(id) AND (EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = teams.id) AND (tm.club_id = teams.club_id) AND (tm.user_id = ( SELECT auth.uid() AS uid)) AND (tm.role_code = 'team_admin'::text))))));


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_roles_delete ON public.user_roles FOR DELETE TO authenticated USING ((private.has_permission('platform.manage'::text) OR ((role_code = ANY (ARRAY['coach'::text, 'player'::text])) AND (club_id IS NOT NULL) AND private.has_permission('members.manage'::text, club_id))));


--
-- Name: user_roles user_roles_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK ((private.has_permission('platform.manage'::text) OR ((role_code = ANY (ARRAY['coach'::text, 'player'::text])) AND (club_id IS NOT NULL) AND private.has_permission('members.manage'::text, club_id))));


--
-- Name: user_roles user_roles_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR private.has_permission('platform.manage'::text) OR private.has_permission('members.manage'::text, club_id)));


--
-- Name: SCHEMA private; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA private TO authenticated;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION apply_due_team_plans(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.apply_due_team_plans() FROM PUBLIC;


--
-- Name: FUNCTION can_manage_match_team(target_team uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.can_manage_match_team(target_team uuid) FROM PUBLIC;


--
-- Name: FUNCTION can_manage_photo(target_user uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.can_manage_photo(target_user uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION private.can_manage_photo(target_user uuid) TO authenticated;


--
-- Name: FUNCTION can_provision(actor uuid, kind text, target_club uuid, target_team uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.can_provision(actor uuid, kind text, target_club uuid, target_team uuid) FROM PUBLIC;


--
-- Name: FUNCTION can_read_match_team(target_team uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.can_read_match_team(target_team uuid) FROM PUBLIC;


--
-- Name: FUNCTION can_read_photo(target_user uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.can_read_photo(target_user uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION private.can_read_photo(target_user uuid) TO authenticated;


--
-- Name: FUNCTION can_view_profile(target_user uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.can_view_profile(target_user uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION private.can_view_profile(target_user uuid) TO authenticated;


--
-- Name: FUNCTION card_inputs(target_season text); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.card_inputs(target_season text) FROM PUBLIC;


--
-- Name: FUNCTION check_member_jersey(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.check_member_jersey() FROM PUBLIC;


--
-- Name: FUNCTION check_player_jersey(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.check_player_jersey() FROM PUBLIC;


--
-- Name: FUNCTION close_ovr_month(target_month date); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.close_ovr_month(target_month date) FROM PUBLIC;


--
-- Name: FUNCTION ensure_player_identity(target_player uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.ensure_player_identity(target_player uuid) FROM PUBLIC;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;


--
-- Name: FUNCTION has_permission(permission text, target_club uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.has_permission(permission text, target_club uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION private.has_permission(permission text, target_club uuid) TO authenticated;


--
-- Name: FUNCTION is_team_admin(target_team uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.is_team_admin(target_team uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION private.is_team_admin(target_team uuid) TO authenticated;


--
-- Name: FUNCTION is_team_coach(target_team uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.is_team_coach(target_team uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION private.is_team_coach(target_team uuid) TO authenticated;


--
-- Name: FUNCTION is_team_player(target_team uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.is_team_player(target_team uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION private.is_team_player(target_team uuid) TO authenticated;


--
-- Name: FUNCTION keep_ovr_history(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.keep_ovr_history() FROM PUBLIC;


--
-- Name: FUNCTION next_team_plan_period(anchor timestamp with time zone, at_time timestamp with time zone); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.next_team_plan_period(anchor timestamp with time zone, at_time timestamp with time zone) FROM PUBLIC;


--
-- Name: FUNCTION oncex_match_points(position_name text, played_minutes integer, goals integer, own_goals integer, assists integer, yellow_cards integer, red_cards integer, clean_sheet boolean); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.oncex_match_points(position_name text, played_minutes integer, goals integer, own_goals integer, assists integer, yellow_cards integer, red_cards integer, clean_sheet boolean) FROM PUBLIC;


--
-- Name: FUNCTION oncex_points_v2(position_name text, duration integer, mins integer, goals integer, own_goals integer, assists integer, yellows integer, reds integer, clean boolean, team_goals integer, opponent_goals integer); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.oncex_points_v2(position_name text, duration integer, mins integer, goals integer, own_goals integer, assists integer, yellows integer, reds integer, clean boolean, team_goals integer, opponent_goals integer) FROM PUBLIC;


--
-- Name: FUNCTION ovr_comparable_population(target_position text, target_category text, target_season text, target_model text); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.ovr_comparable_population(target_position text, target_category text, target_season text, target_model text) FROM PUBLIC;


--
-- Name: FUNCTION photo_user(object_name text); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.photo_user(object_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION private.photo_user(object_name text) TO authenticated;


--
-- Name: FUNCTION recalculate_deleted_match_player(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.recalculate_deleted_match_player() FROM PUBLIC;


--
-- Name: FUNCTION record_activity(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.record_activity() FROM PUBLIC;


--
-- Name: FUNCTION refresh_all_cards(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.refresh_all_cards() FROM PUBLIC;


--
-- Name: FUNCTION refresh_card_season(target_season text); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.refresh_card_season(target_season text) FROM PUBLIC;


--
-- Name: FUNCTION refresh_cards_after_match(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.refresh_cards_after_match() FROM PUBLIC;


--
-- Name: FUNCTION refresh_player_licence(target_licence uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.refresh_player_licence(target_licence uuid) FROM PUBLIC;


--
-- Name: FUNCTION register_player_identity(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.register_player_identity() FROM PUBLIC;


--
-- Name: FUNCTION renew_team_plan(target_team uuid); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.renew_team_plan(target_team uuid) FROM PUBLIC;


--
-- Name: FUNCTION stop_deleted_player_licences(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.stop_deleted_player_licences() FROM PUBLIC;


--
-- Name: FUNCTION validate_ovr_assessment(); Type: ACL; Schema: private; Owner: postgres
--

REVOKE ALL ON FUNCTION private.validate_ovr_assessment() FROM PUBLIC;


--
-- Name: FUNCTION admin_delete_hierarchy(target_kind text, target_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.admin_delete_hierarchy(target_kind text, target_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_delete_hierarchy(target_kind text, target_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_delete_hierarchy(target_kind text, target_id uuid) TO service_role;


--
-- Name: FUNCTION admin_save_club(club_name text, target_club uuid, selected_plan uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.admin_save_club(club_name text, target_club uuid, selected_plan uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_save_club(club_name text, target_club uuid, selected_plan uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_save_club(club_name text, target_club uuid, selected_plan uuid) TO service_role;


--
-- Name: FUNCTION attach_club_photo(target_club uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.attach_club_photo(target_club uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attach_club_photo(target_club uuid) TO authenticated;
GRANT ALL ON FUNCTION public.attach_club_photo(target_club uuid) TO service_role;


--
-- Name: FUNCTION attach_profile_photo(target_user uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.attach_profile_photo(target_user uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attach_profile_photo(target_user uuid) TO authenticated;
GRANT ALL ON FUNCTION public.attach_profile_photo(target_user uuid) TO service_role;


--
-- Name: FUNCTION can_create_account(kind text, target_club uuid, target_team uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.can_create_account(kind text, target_club uuid, target_team uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_create_account(kind text, target_club uuid, target_team uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_create_account(kind text, target_club uuid, target_team uuid) TO service_role;


--
-- Name: FUNCTION can_edit_coach_name(target_coach uuid, target_team uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.can_edit_coach_name(target_coach uuid, target_team uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_edit_coach_name(target_coach uuid, target_team uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_edit_coach_name(target_coach uuid, target_team uuid) TO service_role;


--
-- Name: FUNCTION can_edit_player(target_player uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.can_edit_player(target_player uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_edit_player(target_player uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_edit_player(target_player uuid) TO service_role;


--
-- Name: FUNCTION club_licence_periods(target_club uuid, range_start timestamp with time zone, range_end timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.club_licence_periods(target_club uuid, range_start timestamp with time zone, range_end timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.club_licence_periods(target_club uuid, range_start timestamp with time zone, range_end timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.club_licence_periods(target_club uuid, range_start timestamp with time zone, range_end timestamp with time zone) TO service_role;


--
-- Name: FUNCTION club_player_rankings(target_club uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.club_player_rankings(target_club uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.club_player_rankings(target_club uuid) TO authenticated;
GRANT ALL ON FUNCTION public.club_player_rankings(target_club uuid) TO service_role;


--
-- Name: FUNCTION confirm_match_statistics(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.confirm_match_statistics(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.confirm_match_statistics(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb) TO service_role;


--
-- Name: FUNCTION confirm_match_statistics_v2(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb, expected_revision integer, match_season text, correction_reason text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.confirm_match_statistics_v2(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb, expected_revision integer, match_season text, correction_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.confirm_match_statistics_v2(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb, expected_revision integer, match_season text, correction_reason text) TO service_role;


--
-- Name: FUNCTION confirm_match_statistics_v3(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb, expected_revision integer, match_season text, match_venue text, correction_reason text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.confirm_match_statistics_v3(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb, expected_revision integer, match_season text, match_venue text, correction_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.confirm_match_statistics_v3(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb, expected_revision integer, match_season text, match_venue text, correction_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.confirm_match_statistics_v3(target_match uuid, team_goals integer, opponent_goals integer, performances jsonb, expected_revision integer, match_season text, match_venue text, correction_reason text) TO service_role;


--
-- Name: FUNCTION get_team_plan(target_team uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_team_plan(target_team uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_team_plan(target_team uuid) TO service_role;


--
-- Name: FUNCTION match_revision_history(target_match uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.match_revision_history(target_match uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.match_revision_history(target_match uuid) TO authenticated;
GRANT ALL ON FUNCTION public.match_revision_history(target_match uuid) TO service_role;


--
-- Name: FUNCTION match_summary(target_match uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.match_summary(target_match uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.match_summary(target_match uuid) TO authenticated;
GRANT ALL ON FUNCTION public.match_summary(target_match uuid) TO service_role;


--
-- Name: FUNCTION player_match_totals(target_player uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.player_match_totals(target_player uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.player_match_totals(target_player uuid) TO authenticated;
GRANT ALL ON FUNCTION public.player_match_totals(target_player uuid) TO service_role;


--
-- Name: FUNCTION player_ovr_evolution(target_player uuid, target_season text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.player_ovr_evolution(target_player uuid, target_season text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.player_ovr_evolution(target_player uuid, target_season text) TO authenticated;
GRANT ALL ON FUNCTION public.player_ovr_evolution(target_player uuid, target_season text) TO service_role;


--
-- Name: FUNCTION player_season_points(target_player uuid, target_season text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.player_season_points(target_player uuid, target_season text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.player_season_points(target_player uuid, target_season text) TO authenticated;
GRANT ALL ON FUNCTION public.player_season_points(target_player uuid, target_season text) TO service_role;


--
-- Name: FUNCTION provision_account(actor uuid, new_user uuid, kind text, entity_name text, target_club uuid, target_team uuid, team_category text, assigned_coach uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.provision_account(actor uuid, new_user uuid, kind text, entity_name text, target_club uuid, target_team uuid, team_category text, assigned_coach uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.provision_account(actor uuid, new_user uuid, kind text, entity_name text, target_club uuid, target_team uuid, team_category text, assigned_coach uuid) TO service_role;


--
-- Name: FUNCTION recover_player_identity(permanent_id uuid, target_player uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.recover_player_identity(permanent_id uuid, target_player uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.recover_player_identity(permanent_id uuid, target_player uuid) TO authenticated;
GRANT ALL ON FUNCTION public.recover_player_identity(permanent_id uuid, target_player uuid) TO service_role;


--
-- Name: FUNCTION rename_coach(target_coach uuid, target_team uuid, coach_name text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.rename_coach(target_coach uuid, target_team uuid, coach_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.rename_coach(target_coach uuid, target_team uuid, coach_name text) TO authenticated;
GRANT ALL ON FUNCTION public.rename_coach(target_coach uuid, target_team uuid, coach_name text) TO service_role;


--
-- Name: FUNCTION save_match_lineup(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], substitute_ids uuid[]); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.save_match_lineup(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], substitute_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_match_lineup(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], substitute_ids uuid[]) TO service_role;


--
-- Name: FUNCTION save_match_lineup_v2(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], match_venue text, substitute_ids uuid[]); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.save_match_lineup_v2(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], match_venue text, substitute_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_match_lineup_v2(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], match_venue text, substitute_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.save_match_lineup_v2(target_team uuid, target_match uuid, opponent_name text, match_date date, match_duration integer, starter_ids uuid[], match_venue text, substitute_ids uuid[]) TO service_role;


--
-- Name: FUNCTION schedule_team_plan(target_team uuid, new_plan text, expected_plan text, expected_period_end timestamp with time zone, confirmed boolean); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.schedule_team_plan(target_team uuid, new_plan text, expected_plan text, expected_period_end timestamp with time zone, confirmed boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.schedule_team_plan(target_team uuid, new_plan text, expected_plan text, expected_period_end timestamp with time zone, confirmed boolean) TO service_role;


--
-- Name: FUNCTION set_player_licence(target_player uuid, target_team uuid, activate boolean); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.set_player_licence(target_player uuid, target_team uuid, activate boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_player_licence(target_player uuid, target_team uuid, activate boolean) TO authenticated;
GRANT ALL ON FUNCTION public.set_player_licence(target_player uuid, target_team uuid, activate boolean) TO service_role;


--
-- Name: FUNCTION set_player_score(target_player uuid, score numeric); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.set_player_score(target_player uuid, score numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_player_score(target_player uuid, score numeric) TO service_role;


--
-- Name: FUNCTION team_jersey_available(target_team uuid, jersey integer, excluded_player uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.team_jersey_available(target_team uuid, jersey integer, excluded_player uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.team_jersey_available(target_team uuid, jersey integer, excluded_player uuid) TO authenticated;
GRANT ALL ON FUNCTION public.team_jersey_available(target_team uuid, jersey integer, excluded_player uuid) TO service_role;


--
-- Name: TABLE team_matches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.team_matches TO service_role;


--
-- Name: FUNCTION team_match_list(target_team uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.team_match_list(target_team uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.team_match_list(target_team uuid) TO authenticated;
GRANT ALL ON FUNCTION public.team_match_list(target_team uuid) TO service_role;


--
-- Name: FUNCTION team_player_licences(target_team uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.team_player_licences(target_team uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.team_player_licences(target_team uuid) TO authenticated;
GRANT ALL ON FUNCTION public.team_player_licences(target_team uuid) TO service_role;


--
-- Name: FUNCTION viewer_club_plan(target_club uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.viewer_club_plan(target_club uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.viewer_club_plan(target_club uuid) TO authenticated;
GRANT ALL ON FUNCTION public.viewer_club_plan(target_club uuid) TO service_role;


--
-- Name: TABLE activity_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.activity_log TO service_role;
GRANT SELECT ON TABLE public.activity_log TO authenticated;


--
-- Name: SEQUENCE activity_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.activity_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.activity_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.activity_log_id_seq TO service_role;


--
-- Name: TABLE club_subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.club_subscriptions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.club_subscriptions TO authenticated;


--
-- Name: TABLE clubs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clubs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.clubs TO authenticated;


--
-- Name: TABLE match_players; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.match_players TO service_role;


--
-- Name: TABLE permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.permissions TO service_role;
GRANT SELECT ON TABLE public.permissions TO authenticated;


--
-- Name: TABLE photo_processing_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.photo_processing_settings TO service_role;
GRANT SELECT ON TABLE public.photo_processing_settings TO authenticated;


--
-- Name: COLUMN photo_processing_settings.background_removal_enabled; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(background_removal_enabled) ON TABLE public.photo_processing_settings TO authenticated;


--
-- Name: TABLE plans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.plans TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.plans TO authenticated;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.full_name; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(full_name) ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles."position"; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE("position") ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.birth_date; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(birth_date) ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.sporting_role; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(sporting_role) ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.preferred_foot; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(preferred_foot) ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.jersey_number; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(jersey_number) ON TABLE public.profiles TO authenticated;


--
-- Name: TABLE role_permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.role_permissions TO service_role;
GRANT SELECT ON TABLE public.role_permissions TO authenticated;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.roles TO service_role;
GRANT SELECT ON TABLE public.roles TO authenticated;


--
-- Name: TABLE team_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.team_members TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.team_members TO authenticated;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.teams TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.teams TO authenticated;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.user_roles TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

