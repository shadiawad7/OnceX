begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

-- Competition metadata only. Existing team RLS and match/scoring RPCs are retained.
create function private.valid_team_federation_groups(groups jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare g jsonb; t jsonb; season text; field text;
begin
 if groups is null or jsonb_typeof(groups)<>'array' then return false;end if;
 if jsonb_array_length(groups)>12 or octet_length(groups::text)>300000 then return false;end if;
 for g in select value from jsonb_array_elements(groups) loop
  if jsonb_typeof(g)<>'object' or g->>'source' is distinct from 'ffcv' then return false;end if;
  foreach field in array array['seasonId','seasonCode','competitionId','competitionName','groupId','groupName','ownTeamId','sourceUrl','importedAt'] loop
   if jsonb_typeof(g->field) is distinct from 'string' then return false;end if;
  end loop;
  if coalesce(g->>'seasonId','') !~ '^[0-9]{1,15}$' or coalesce(g->>'competitionId','') !~ '^[0-9]{1,15}$' or coalesce(g->>'groupId','') !~ '^[0-9]{1,15}$' or coalesce(g->>'ownTeamId','') !~ '^[0-9]{1,15}$' then return false;end if;
  season:=g->>'seasonCode';
  if season is null or season !~ '^[0-9]{4}/[0-9]{4}$' then return false;end if;
  if split_part(season,'/',2)::integer<>split_part(season,'/',1)::integer+1 then return false;end if;
  if length(trim(coalesce(g->>'competitionName',''))) not between 1 and 160 or length(trim(coalesce(g->>'groupName',''))) not between 1 and 160 then return false;end if;
  if coalesce(g->>'sourceUrl','') !~ '^https://ffcv[.]es/competiciones/[?]' or length(g->>'sourceUrl')>2048 or length(coalesce(g->>'importedAt','')) not between 1 and 64 then return false;end if;
  if jsonb_typeof(g->'teams') is distinct from 'array' then return false;end if;
  if jsonb_array_length(g->'teams') not between 2 and 64 then return false;end if;
  for t in select value from jsonb_array_elements(g->'teams') loop
   if jsonb_typeof(t)<>'object' or jsonb_typeof(t->'id') is distinct from 'string' or jsonb_typeof(t->'name') is distinct from 'string' or coalesce(t->>'id','') !~ '^[0-9]{1,15}$' or length(trim(coalesce(t->>'name',''))) not between 1 and 160 then return false;end if;
   if t->>'badgeUrl' is not null and (length(t->>'badgeUrl')>2048 or t->>'badgeUrl' !~ '^https://([a-z0-9-]+[.])*(ffcv[.]es|novanet[.]es)/') then return false;end if;
  end loop;
  if not exists(select 1 from jsonb_array_elements(g->'teams') as entry(value) where entry.value->>'id'=g->>'ownTeamId') then return false;end if;
  if (select count(*) from jsonb_array_elements(g->'teams'))<>(select count(distinct entry.value->>'id') from jsonb_array_elements(g->'teams') as entry(value)) then return false;end if;
 end loop;
 return (select count(*) from jsonb_array_elements(groups))=(select count(distinct entry.value->>'seasonCode') from jsonb_array_elements(groups) as entry(value));
end;
$$;
revoke all on function private.valid_team_federation_groups(jsonb) from public,anon;
grant execute on function private.valid_team_federation_groups(jsonb) to authenticated,service_role;

alter table public.teams add column federation_groups jsonb not null default '[]'::jsonb;
alter table public.teams add constraint teams_federation_groups_valid check(private.valid_team_federation_groups(federation_groups));

-- SECURITY INVOKER: the caller's existing teams UPDATE/SELECT policies apply.
-- The expression merges against the locked row, retaining other seasons on concurrent saves.
create function public.save_team_federation_group(target_team uuid,selected_group jsonb,team_name text default null,team_category text default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare updated jsonb;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501';end if;
 if team_name is not null and length(trim(team_name)) not between 1 and 120 then raise exception 'Indica el nombre del equipo.' using errcode='22023';end if;
 if team_category is not null and length(trim(team_category))=0 then raise exception 'Selecciona la categoría del equipo.' using errcode='22023';end if;
 if not private.valid_team_federation_groups(jsonb_build_array(selected_group)) then raise exception 'Revisa la temporada, competición, grupo y equipo federativo.' using errcode='22023';end if;
 update public.teams t set name=coalesce(trim(team_name),t.name),category=coalesce(team_category,t.category),federation_groups=jsonb_build_array(selected_group)||(
  select coalesce(jsonb_agg(item.value order by item.ord),'[]'::jsonb)
  from jsonb_array_elements(t.federation_groups) with ordinality item(value,ord)
  where item.value->>'seasonCode'<>selected_group->>'seasonCode'
 ) where t.id=target_team returning t.federation_groups into updated;
 if not found then raise exception 'No puedes configurar este equipo.' using errcode='42501';end if;
 return updated;
end;
$$;
revoke all on function public.save_team_federation_group(uuid,jsonb,text,text) from public,anon;
grant execute on function public.save_team_federation_group(uuid,jsonb,text,text) to authenticated;
commit;
