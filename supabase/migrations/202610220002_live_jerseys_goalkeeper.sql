begin;
-- Preload occupied numbers before typing. No names/personal data are returned.
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


-- Applies to initial confirmations and official corrections, without touching history.
create function private.require_starting_goalkeeper() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='confirmed' and not exists(select 1 from public.match_players where match_id=new.id and starter and player_position='Portero') then raise exception 'Los 11 titulares deben incluir al menos un portero.' using errcode='22023';end if;
 return new;
end;$$;
create trigger match_requires_goalkeeper before update on public.team_matches for each row execute function private.require_starting_goalkeeper();
revoke all on function private.require_starting_goalkeeper() from public,anon,authenticated;
commit;
