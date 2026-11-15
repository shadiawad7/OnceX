begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- Limits for the match sheet, not squad licences or the number of substitutions.
-- Only new lineup inserts/moves are checked; no historical rows or scoring RPCs change.
create table private.match_callup_rules(
 season_code text not null,
 competition_key text not null,
 maximum integer not null check(maximum between 11 and 23),
 rule_code text not null,
 source_url text not null,
 primary key(season_code,competition_key)
);
alter table private.match_callup_rules enable row level security;
revoke all on private.match_callup_rules from public,anon,authenticated;

create function private.callup_competition_key(value text) returns text
language sql immutable set search_path='' as $$
 select trim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
 translate(lower(trim(split_part(coalesce(value,''),' · ',1))),
 'àáäâèéëêìíïîòóöôùúüûçñ','aaaaeeeeiiiioooouuuucn'),
 '^(lliga|liga)[[:space:]]+','',''),
 '\mcadete\M','cadet','g'),'\mpreferente\M','preferent','g'),'[[:space:]]+',' ','g'));
$$;
revoke all on function private.callup_competition_key(text) from public,anon,authenticated;

-- This seed is mirrored by src/data/matchCallupRules.json for immediate UI feedback.
insert into private.match_callup_rules(season_code,competition_key,maximum,rule_code,source_url)
select rule->>'season',private.callup_competition_key(name.value),(rule->>'maximum')::integer,rule->>'code',rule->>'source'
from jsonb_array_elements($rules$[
  {
    "code": "ffcv-territorial-2026",
    "season": "2026/2027",
    "maximum": 18,
    "source": "https://ffcv.es/wp/wp-content/uploads/2026/08/Circular-8-Disposiciones-Generales-Futbol-v3.0-publicada.pdf",
    "competitions": [
      "Lliga Comunitat FFCV",
      "Lliga Primera FFCV",
      "Lliga Segona FFCV",
      "Lliga Tercera FFCV",
      "Lliga Segunda FFCV",
      "Lliga Comunitat Juvenil",
      "Lliga Comunitat FFCV Juvenil",
      "Lliga Primera FFCV Juvenil",
      "Lliga Segona FFCV Juvenil",
      "Lliga Tercera FFCV Juvenil"
    ]
  },
  {
    "code": "ffcv-cadete-infantil-2026",
    "season": "2026/2027",
    "maximum": 18,
    "source": "https://ffcv.es/wp/wp-content/uploads/2026/09/Circular-18-Cadetes-e-Infantiles-v3.0-publicada.pdf",
    "competitions": [
      "Lliga Autonòmica Cadet",
      "Lliga Preferent Cadet",
      "Primera Cadet",
      "Segona Cadet",
      "Primera Regional Cadete",
      "Segunda Regional Cadete",
      "Lliga Autonòmica Infantil",
      "Lliga Preferent Infantil",
      "Primera Infantil",
      "Segona Infantil",
      "Primera Regional Infantil",
      "Segunda Regional Infantil"
    ]
  },
  {
    "code": "rfef-lnj-2026",
    "season": "2026/2027",
    "maximum": 18,
    "source": "https://rfef.es/sites/default/files/pdf/circulares/2._Circular_90-_LNJ___Anexo.pdf",
    "competitions": [
      "Liga Nacional Juvenil"
    ]
  },
  {
    "code": "rfef-dhj-2026",
    "season": "2026/2027",
    "maximum": 18,
    "source": "https://rfef.es/sites/default/files/pdf/circulares/1._Circular_89-_CNL_DHJ_Y_CC___Anexo.pdf",
    "competitions": [
      "División de Honor Juvenil"
    ]
  },
  {
    "code": "rfef-dhj-campeones-2026",
    "season": "2026/2027",
    "maximum": 22,
    "source": "https://rfef.es/sites/default/files/pdf/circulares/1._Circular_89-_CNL_DHJ_Y_CC___Anexo.pdf",
    "competitions": [
      "Copa de Campeones Juvenil",
      "Copa Campeones Juvenil",
      "Copa de Campeones"
    ]
  },
  {
    "code": "rfef-tercera-2026",
    "season": "2026/2027",
    "maximum": 20,
    "source": "https://rfef.es/sites/default/files/pdf/circulares/4._Circular_87_-_CNL_Tercera_Federacion___Anexo.pdf",
    "competitions": [
      "Tercera Federación",
      "Tercera RFEF"
    ]
  },
  {
    "code": "rfef-segunda-2026",
    "season": "2026/2027",
    "maximum": 20,
    "source": "https://rfef.es/sites/default/files/pdf/circulares/3._Circular_86_-_CNL_Segunda_Federacion___Anexo.pdf",
    "competitions": [
      "Segunda Federación",
      "Segunda RFEF"
    ]
  },
  {
    "code": "rfef-primera-2026",
    "season": "2026/2027",
    "maximum": 23,
    "source": "https://rfef.es/sites/default/files/pdf/circulares/2._Circular_85_-_CNL_Primera_Federacion___Anexo.pdf",
    "competitions": [
      "Primera Federación",
      "Primera RFEF"
    ]
  },
  {
    "code": "ffcv-nostra-copa-2026",
    "season": "2026/2027",
    "maximum": 20,
    "source": "https://ffcv.es/wp/wp-content/uploads/2026/09/Circular-21-La-Nostra-Copa-Futbol-11-v3.0-publicada.pdf",
    "competitions": [
      "La Nostra Copa",
      "Copa Comunitat Mediterránea La Nostra Copa"
    ]
  }
]
$rules$::jsonb) as entry(rule)
cross join lateral jsonb_array_elements_text(rule->'competitions') as name(value);

create function private.match_callup_limit(target_team uuid,target_date date) returns integer
language plpgsql stable set search_path='' as $$
declare season text; first_year integer; category text; selected_group jsonb; modality text; ceiling integer;
begin
 if target_date is null then return null;end if;
 first_year:=extract(year from target_date)::integer-case when extract(month from target_date)<7 then 1 else 0 end;
 season:=first_year::text||'/'||(first_year+1)::text;
 select t.category,(select entry.value from jsonb_array_elements(t.federation_groups) as entry(value) where entry.value->>'seasonCode'=season limit 1)
 into category,selected_group from public.teams t where t.id=target_team;
 if not found then return null;end if;
 if jsonb_typeof(selected_group->'modality')='string' then modality:=private.callup_competition_key(selected_group->>'modality');end if;
 if coalesce(modality,'')<>'' and modality not in ('masculi f11','masculino f11','masculino futbol 11') then return null;end if;
 category:=private.callup_competition_key(coalesce(selected_group->>'competitionName',category));
 if category='division de honor juvenil' and private.callup_competition_key(selected_group->>'groupName')~'copa.*campeon' then category:='copa de campeones juvenil';end if;
 select r.maximum into ceiling from private.match_callup_rules r where r.season_code=season and r.competition_key=category;
 return ceiling;
end;
$$;
revoke all on function private.match_callup_limit(uuid,date) from public,anon,authenticated;

create function private.enforce_match_callup_limit() returns trigger
language plpgsql security definer set search_path='' as $$
declare parent public.team_matches; ceiling integer; existing integer;
begin
 if tg_op='UPDATE' and new.match_id=old.match_id then return new;end if;
 -- Serialize concurrent additions to this match before counting its lineup.
 select * into parent from public.team_matches where id=new.match_id for update;
 if not found then return new;end if;
 ceiling:=private.match_callup_limit(parent.team_id,parent.played_on);
 if ceiling is null then return new;end if;
 select count(*) into existing from public.match_players where match_id=new.match_id;
 if existing>=ceiling then raise exception 'Esta competición permite un máximo de % convocados.',ceiling using errcode='22023';end if;
 return new;
end;
$$;
revoke all on function private.enforce_match_callup_limit() from public,anon,authenticated;
create trigger match_callup_limit before insert or update of match_id on public.match_players
for each row execute function private.enforce_match_callup_limit();

-- Initial confirmation also validates drafts saved before this migration.
-- Corrections to already-confirmed historical actas are intentionally unaffected.
create function private.enforce_confirmed_callup_limit() returns trigger
language plpgsql security definer set search_path='' as $$
declare ceiling integer; total integer;
begin
 ceiling:=private.match_callup_limit(new.team_id,new.played_on);
 if ceiling is null then return new;end if;
 select count(*) into total from public.match_players where match_id=new.id;
 if total>ceiling then raise exception 'Esta competición permite un máximo de % convocados. Revisa la alineación.',ceiling using errcode='22023';end if;
 return new;
end;
$$;
revoke all on function private.enforce_confirmed_callup_limit() from public,anon,authenticated;
create trigger match_confirmation_callup_limit before update of status on public.team_matches
for each row when(old.status='draft' and new.status='confirmed')
execute function private.enforce_confirmed_callup_limit();
commit;
