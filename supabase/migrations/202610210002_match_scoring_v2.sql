-- Review before executing. No historical points or clean sheets are recalculated.
begin;
alter table public.team_matches add column revision integer not null default 0,add column season_code text;
alter table public.match_players add column conceded_while_playing smallint check(conceded_while_playing between 0 and 99),add column points_breakdown jsonb,add column scoring_version text not null default 'oncex-match-v1';
create table private.match_scoring_weights(version text not null,position_name text not null,goal integer not null,own_goal integer not null,assist integer not null,yellow integer not null,red integer not null,clean_sheet integer not null,primary key(version,position_name));
insert into private.match_scoring_weights values
 ('oncex-match-v2','Portero',8,-5,5,-4,-6,4),
 ('oncex-match-v2','Defensa',6,-4,4,-3,-5,3),
 ('oncex-match-v2','Centrocampista',5,-3,3,-2,-4,2),
 ('oncex-match-v2','Delantero',4,-2,2,-1,-3,1);
create table private.match_revisions(id uuid primary key default gen_random_uuid(),match_id uuid not null,revision integer not null,actor uuid,reason text not null,recorded_at timestamptz not null default now(),before_data jsonb not null,after_data jsonb not null,unique(match_id,revision));
alter table private.match_scoring_weights enable row level security;
alter table private.match_revisions enable row level security;
revoke all on private.match_scoring_weights,private.match_revisions from public,anon,authenticated;
create function private.oncex_points_v2(position_name text,duration integer,mins integer,goals integer,own_goals integer,assists integer,yellows integer,reds integer,clean boolean,team_goals integer,opponent_goals integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare w private.match_scoring_weights; parts jsonb; total numeric;
begin
 select * into w from private.match_scoring_weights where version='oncex-match-v2' and match_scoring_weights.position_name=oncex_points_v2.position_name;
 if not found then raise exception 'Define la posición del jugador antes de confirmar.' using errcode='22023';end if;
 parts:=jsonb_build_object('participation',case when mins>=round(duration*2.0/3) then 2 else 0 end,'goals',goals*w.goal,'ownGoals',own_goals*w.own_goal,'assists',assists*w.assist,'yellowCards',yellows*w.yellow,'redCards',reds*w.red,'cleanSheet',case when clean then w.clean_sheet else 0 end,'result',case when mins>0 then case when team_goals>opponent_goals then 2 when team_goals=opponent_goals then 1 else 0 end else 0 end);
 select sum(value::numeric) into total from jsonb_each_text(parts);
 return jsonb_build_object('version','oncex-match-v2','parts',parts,'total',total);
end;$$;
revoke all on function private.oncex_points_v2(text,integer,integer,integer,integer,integer,integer,integer,boolean,integer,integer) from public,anon,authenticated;
create function public.confirm_match_statistics_v2(target_match uuid,team_goals integer,opponent_goals integer,performances jsonb,expected_revision integer,match_season text,correction_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
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
 if (select coalesce(sum(goals),0) from public.match_players where match_id=m.id)>team_goals then raise exception 'Los goles de jugadores no pueden superar el resultado del equipo.' using errcode='22023';end if;
 if (select coalesce(sum(minutes),0) from public.match_players where match_id=m.id)>11*m.duration then raise exception 'La suma de minutos supera los disponibles para 11 jugadores.' using errcode='22023';end if;
 if (select coalesce(sum(own_goals),0) from public.match_players where match_id=m.id)>opponent_goals then raise exception 'Los goles en propia superan los goles del rival.' using errcode='22023';end if;
 if (select coalesce(sum(assists),0) from public.match_players where match_id=m.id)>team_goals then raise exception 'Las asistencias no pueden superar los goles del equipo.' using errcode='22023';end if;
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
$$;

-- Old clients must update instead of silently applying the old formula to new matches.
revoke all on function public.confirm_match_statistics(uuid,integer,integer,jsonb) from public,anon,authenticated;
revoke all on function public.confirm_match_statistics_v2(uuid,integer,integer,jsonb,integer,text,text) from public,anon;
grant execute on function public.confirm_match_statistics_v2(uuid,integer,integer,jsonb,integer,text,text) to authenticated;
create function public.match_revision_history(target_match uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.team_matches m where m.id=target_match and private.can_manage_match_team(m.team_id)) then raise exception 'No puedes consultar las revisiones de este partido.' using errcode='42501';end if;
 return(select coalesce(jsonb_agg(to_jsonb(r) order by r.revision desc),'[]') from private.match_revisions r where r.match_id=target_match);
end;$$;
revoke all on function public.match_revision_history(uuid) from public,anon;
grant execute on function public.match_revision_history(uuid) to authenticated;
create function public.player_season_points(target_player uuid,target_season text) returns numeric
language plpgsql stable security definer set search_path='' as $$
begin
 if target_player is distinct from auth.uid() and not public.can_edit_player(target_player) then raise exception 'No puedes consultar este jugador.' using errcode='42501';end if;
 return(select coalesce(sum(p.oncex_points),0) from public.match_players p join public.team_matches m on m.id=p.match_id where p.player_id=target_player and m.status='confirmed' and m.season_code=target_season);
end;$$;
revoke all on function public.player_season_points(uuid,text) from public,anon;
grant execute on function public.player_season_points(uuid,text) to authenticated;
commit;
