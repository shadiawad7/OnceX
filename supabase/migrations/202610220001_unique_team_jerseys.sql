-- No player data are changed. Existing duplicates must be reviewed manually.
begin;
create function public.team_jersey_available(target_team uuid,jersey integer,excluded_player uuid default null) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare club uuid;
begin
 select club_id into club from public.teams where id=target_team;
 if club is null or not(private.has_permission('members.manage',club) or private.is_team_admin(target_team) or private.is_team_coach(target_team)) then raise exception 'No puedes consultar los dorsales de este equipo.' using errcode='42501';end if;
 if jersey is null or jersey not between 1 and 99 then raise exception 'El dorsal debe estar entre 1 y 99.' using errcode='22023';end if;
 return not exists(select 1 from public.team_members tm join public.profiles p on p.id=tm.user_id where tm.team_id=target_team and tm.role_code='player' and p.jersey_number=jersey and p.id is distinct from excluded_player);
end;$$;
revoke all on function public.team_jersey_available(uuid,integer,uuid) from public,anon;
grant execute on function public.team_jersey_available(uuid,integer,uuid) to authenticated;

create function private.check_player_jersey() returns trigger
language plpgsql security definer set search_path='' as $$
declare team record;
begin
 if new.jersey_number is null or new.jersey_number is not distinct from old.jersey_number then return new;end if;
 for team in select distinct team_id from public.team_members where user_id=new.id and role_code='player' order by team_id loop
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('oncex-team-jersey:'||team.team_id::text,0));
 end loop;
 if exists(select 1 from public.team_members own join public.team_members other on other.team_id=own.team_id and other.role_code='player' join public.profiles p on p.id=other.user_id where own.user_id=new.id and own.role_code='player' and p.id<>new.id and p.jersey_number=new.jersey_number) then raise exception 'Este dorsal ya está ocupado por otro jugador del equipo. Elige otro número.' using errcode='23505';end if;
 return new;
end;$$;
create trigger unique_player_jersey before update of jersey_number on public.profiles for each row execute function private.check_player_jersey();
create function private.check_member_jersey() returns trigger
language plpgsql security definer set search_path='' as $$
declare jersey integer;
begin
 if new.role_code<>'player' then return new;end if;
 select jersey_number into jersey from public.profiles where id=new.user_id for update;
 if jersey is null then return new;end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('oncex-team-jersey:'||new.team_id::text,0));
 if exists(select 1 from public.team_members tm join public.profiles p on p.id=tm.user_id where tm.team_id=new.team_id and tm.role_code='player' and p.id<>new.user_id and p.jersey_number=jersey) then raise exception 'Este dorsal ya está ocupado por otro jugador del equipo. Elige otro número.' using errcode='23505';end if;
 return new;
end;$$;
create trigger unique_member_jersey before insert or update of team_id,user_id,role_code on public.team_members for each row execute function private.check_member_jersey();
revoke all on function private.check_player_jersey(),private.check_member_jersey() from public,anon,authenticated;
commit;
