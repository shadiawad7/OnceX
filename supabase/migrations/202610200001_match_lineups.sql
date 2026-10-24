begin;
-- The official formula is an accumulated raw score: negative and >100 totals
-- are valid; do not clamp or invent a normalization.
alter table public.profiles drop constraint if exists profiles_oncex_score_check;
alter table public.profiles alter column oncex_score type numeric(12,2);
create table public.team_matches (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.teams(id) on delete cascade,
 opponent text not null check(length(trim(opponent)) between 1 and 120),
 played_on date not null,
 duration smallint not null check(duration between 1 and 150),
 goals_for smallint check(goals_for between 0 and 99),
 goals_against smallint check(goals_against between 0 and 99),
 status text not null default 'draft' check(status in ('draft','confirmed')),
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 check(status='draft' or (goals_for is not null and goals_against is not null))
);
create table public.match_players (
 match_id uuid not null references public.team_matches(id) on delete cascade,
 slot_id uuid primary key default gen_random_uuid(),
 player_id uuid references public.profiles(id) on delete set null,
 player_name text not null,
 player_position text not null default '',
 starter boolean not null,
 minutes smallint check(minutes between 0 and 150),
 goals smallint not null default 0 check(goals between 0 and 99),
 own_goals smallint not null default 0 check(own_goals between 0 and 99),
 assists smallint not null default 0 check(assists between 0 and 99),
 yellow_cards smallint not null default 0 check(yellow_cards between 0 and 2),
 red_cards smallint not null default 0 check(red_cards between 0 and 1),
 clean_sheet boolean,
 oncex_points numeric(10,2),
 unique(match_id,player_id)
);
create index team_matches_recent on public.team_matches(team_id,played_on desc);
alter table public.team_matches enable row level security;
alter table public.match_players enable row level security;
revoke all on public.team_matches,public.match_players from anon,authenticated;
-- Narrow definer RPCs validate the team and lineup; no direct writes bypass them.
create function private.can_read_match_team(target_team uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.teams t where t.id=target_team and (
 private.has_permission('members.manage',t.club_id) or private.is_team_admin(t.id)
 or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.user_id=auth.uid())));
$$;
create function private.can_manage_match_team(target_team uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.teams t where t.id=target_team and (private.has_permission('members.manage',t.club_id) or private.is_team_coach(t.id)));
$$;
create function public.save_match_lineup(target_team uuid,target_match uuid,opponent_name text,match_date date,match_duration integer,starter_ids uuid[],substitute_ids uuid[] default '{}')
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

-- Exactly the eight official statistics. One appearance requires >0 minutes.
create function private.oncex_match_points(position_name text,played_minutes integer,goals integer,own_goals integer,assists integer,yellow_cards integer,red_cards integer,clean_sheet boolean)
returns numeric language plpgsql immutable set search_path='' as $$
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
revoke all on function private.oncex_match_points(text,integer,integer,integer,integer,integer,integer,boolean) from public,anon,authenticated;

create function public.confirm_match_statistics(target_match uuid,team_goals integer,opponent_goals integer,performances jsonb)
returns void language plpgsql security definer set search_path='' as $$
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

create function public.team_match_list(target_team uuid) returns setof public.team_matches
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.can_read_match_team(target_team) then raise exception 'No tienes acceso a este equipo.' using errcode='42501';end if;
 return query select m.* from public.team_matches m where m.team_id=target_team and (m.status='confirmed' or private.can_manage_match_team(m.team_id)) order by m.played_on desc,m.created_at desc;
end;
$$;
create function public.match_summary(target_match uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare m public.team_matches;
begin
 select * into m from public.team_matches where id=target_match;
 if not found or not private.can_read_match_team(m.team_id) or (m.status='draft' and not private.can_manage_match_team(m.team_id)) then raise exception 'No tienes acceso a este partido.' using errcode='42501';end if;
 return jsonb_build_object('match',to_jsonb(m),'players',(select coalesce(jsonb_agg(to_jsonb(mp)||jsonb_build_object('photo_path',p.photo_path) order by mp.starter desc,mp.player_name),'[]') from public.match_players mp left join public.profiles p on p.id=mp.player_id where mp.match_id=m.id));
end;
$$;
-- Removing a match (for example when an empty team is deleted) must not
-- leave points from that match cached on the surviving player profiles.
create function private.recalculate_deleted_match_player() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.player_id is not null then
  update public.profiles p set oncex_score=(select coalesce(sum(mp.oncex_points),0) from public.match_players mp join public.team_matches m on m.id=mp.match_id where mp.player_id=old.player_id and m.status='confirmed') where p.id=old.player_id;
 end if;
 return old;
end;
$$;
revoke all on function private.recalculate_deleted_match_player() from public,anon,authenticated;
create trigger match_player_points_after_delete after delete on public.match_players for each row execute function private.recalculate_deleted_match_player();

create function public.player_match_totals(target_player uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if target_player is null or (target_player is distinct from auth.uid() and not public.can_edit_player(target_player) and not exists(select 1 from public.team_members tm where tm.user_id=target_player and tm.role_code='player' and private.is_team_coach(tm.team_id))) then raise exception 'No tienes acceso a las estadísticas de este jugador.' using errcode='42501';end if;
 return (select jsonb_build_object('Partidos',count(*) filter(where mp.minutes>0),'Minutos',coalesce(sum(mp.minutes),0),'Goles',coalesce(sum(mp.goals),0),'Goles en propia',coalesce(sum(mp.own_goals),0),'Asistencias',coalesce(sum(mp.assists),0),'Amarillas',coalesce(sum(mp.yellow_cards),0),'Rojas',coalesce(sum(mp.red_cards),0),'Clean Sheets',case when count(mp.clean_sheet)=0 then null else count(*) filter(where mp.clean_sheet) end) from public.match_players mp join public.team_matches m on m.id=mp.match_id where mp.player_id=target_player and m.status='confirmed');
end;
$$;
revoke all on function private.can_read_match_team(uuid),private.can_manage_match_team(uuid) from public,anon,authenticated;
revoke all on function public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[]),public.confirm_match_statistics(uuid,integer,integer,jsonb),public.team_match_list(uuid),public.match_summary(uuid),public.player_match_totals(uuid) from public,anon;
grant execute on function public.save_match_lineup(uuid,uuid,text,date,integer,uuid[],uuid[]),public.confirm_match_statistics(uuid,integer,integer,jsonb),public.team_match_list(uuid),public.match_summary(uuid),public.player_match_totals(uuid) to authenticated;
commit;
