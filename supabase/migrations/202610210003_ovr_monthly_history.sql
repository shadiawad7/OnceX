-- Architecture only: no seeded formula, cohorts, OVR values or monthly snapshots.
-- Requires permanent player identities and the match/season migrations.
begin;
create table private.ovr_models (
 version text primary key,
 approved boolean not null default false,
 minimum_cohort integer not null check(minimum_cohort>=2),
 minimum_minutes integer not null check(minimum_minutes>=0),
 minimum_matches integer not null check(minimum_matches>=1),
 specification jsonb not null,
 created_at timestamptz not null default now()
);
-- Explicit mapping: do not silently mix Juvenil/Cadete/Senior or guess from team names.
create table private.ovr_category_mapping(team_category text primary key,category_key text not null check(length(trim(category_key))>0));
create table private.ovr_assessments (
 id uuid primary key default gen_random_uuid(),
 identity_id uuid not null references private.player_identities(id) on delete restrict,
 season_code text not null check(season_code ~ '^[0-9]{4}/[0-9]{4}$'),
 position_name text not null check(position_name in ('Portero','Defensa','Centrocampista','Delantero')),
 category_key text not null check(length(trim(category_key))>0),
 model_version text not null references private.ovr_models(version),
 assessed_at timestamptz not null default now(),
 data_cutoff timestamptz not null check(data_cutoff<=assessed_at),
 overall smallint not null check(overall between 0 and 99),
 attributes jsonb not null,
 comparable_count integer not null check(comparable_count>=2),
 reliability numeric not null check(reliability between 0 and 1),
 participated_minutes integer not null check(participated_minutes>=0),
 participated_matches integer not null check(participated_matches>=0)
);
create index ovr_assessment_history on private.ovr_assessments(identity_id,season_code,assessed_at desc);
create table private.ovr_monthly_snapshots (
 identity_id uuid not null references private.player_identities(id) on delete restrict,
 season_code text not null,
 month date not null check(extract(day from month)=1),
 assessment_id uuid not null references private.ovr_assessments(id),
 overall smallint not null check(overall between 0 and 99),
 attributes jsonb not null,
 model_version text not null,
 reliability numeric not null,
 comparable_count integer not null,
 captured_at timestamptz not null default now(),
 primary key(identity_id,season_code,month)
);
alter table private.ovr_models enable row level security;
alter table private.ovr_category_mapping enable row level security;
alter table private.ovr_assessments enable row level security;
alter table private.ovr_monthly_snapshots enable row level security;
revoke all on private.ovr_models,private.ovr_category_mapping,private.ovr_assessments,private.ovr_monthly_snapshots from public,anon,authenticated;

create function private.validate_ovr_assessment() returns trigger language plpgsql set search_path='' as $$
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
create trigger validate_real_ovr before insert on private.ovr_assessments for each row execute function private.validate_ovr_assessment();
create function private.keep_ovr_history() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'El histórico de OVR es inmutable. Registra una nueva valoración sin sobrescribir el pasado.' using errcode='55000';end;$$;
create trigger ovr_assessments_immutable before update or delete on private.ovr_assessments for each row execute function private.keep_ovr_history();
create trigger ovr_months_immutable before update or delete on private.ovr_monthly_snapshots for each row execute function private.keep_ovr_history();

-- Private service hook. No API client (including superadmin) can write arbitrary OVRs.
-- A future approved computation service inserts assessments, never the mobile app.
create function private.close_ovr_month(target_month date) returns integer
language plpgsql security definer set search_path='' set timezone='Europe/Madrid' as $$
declare inserted integer;
begin
 if target_month is null or extract(day from target_month)<>1 or target_month>=date_trunc('month',now())::date then raise exception 'Solo se pueden cerrar meses completos.' using errcode='22023';end if;
 insert into private.ovr_monthly_snapshots(identity_id,season_code,month,assessment_id,overall,attributes,model_version,reliability,comparable_count)
 select a.identity_id,a.season_code,target_month,a.id,a.overall,a.attributes,a.model_version,a.reliability,a.comparable_count
 from (select distinct on(identity_id,season_code) * from private.ovr_assessments where assessed_at>=target_month::timestamptz and assessed_at<(target_month+interval '1 month')::timestamptz order by identity_id,season_code,assessed_at desc,id desc) a
 on conflict(identity_id,season_code,month) do nothing;
 get diagnostics inserted=row_count;return inserted;
end;$$;

-- ONCEX-wide comparable population, never limited to a team or club.
-- Empty until explicit category mappings and an approved participation policy exist.
-- Private output is available only to the future server-side model, not app users.
create function private.ovr_comparable_population(target_position text,target_category text,target_season text,target_model text)
returns table(identity_id uuid,matches bigint,minutes bigint,goals bigint,own_goals bigint,assists bigint,yellow_cards bigint,red_cards bigint,clean_sheets bigint)
language sql stable security definer set search_path='' as $$
 select i.id,count(*) filter(where mp.minutes>0),sum(mp.minutes)::bigint,sum(mp.goals)::bigint,sum(mp.own_goals)::bigint,sum(mp.assists)::bigint,sum(mp.yellow_cards)::bigint,sum(mp.red_cards)::bigint,count(*) filter(where mp.clean_sheet)
 from public.match_players mp join public.team_matches m on m.id=mp.match_id
 join public.teams t on t.id=m.team_id join private.ovr_category_mapping c on c.team_category=t.category
 join private.player_identities i on i.profile_id=mp.player_id join private.ovr_models model on model.version=target_model and model.approved
 where m.status='confirmed' and m.season_code=target_season and mp.player_position=target_position and c.category_key=target_category
 group by i.id,model.minimum_matches,model.minimum_minutes
 having count(*) filter(where mp.minutes>0)>=model.minimum_matches and sum(mp.minutes)>=model.minimum_minutes;
$$;

create function public.player_ovr_evolution(target_player uuid,target_season text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare identity uuid; selected_season text; current_rating private.ovr_assessments; baseline_rating private.ovr_assessments; snapshots jsonb;
begin
 if target_player is null or (target_player is distinct from auth.uid() and not public.can_edit_player(target_player)) then raise exception 'No puedes consultar la evolución de este jugador.' using errcode='42501';end if;
 select id into identity from private.player_identities where profile_id=target_player;
 selected_season:=target_season;
 if selected_season is null then
  select season_code into selected_season from (select season_code,assessed_at as date from private.ovr_assessments where identity_id=identity union all select m.season_code,m.played_on::timestamptz from public.match_players mp join public.team_matches m on m.id=mp.match_id where mp.player_id=target_player and m.status='confirmed' and m.season_code is not null) seasons order by date desc limit 1;
 end if;
 select * into current_rating from private.ovr_assessments where identity_id=identity and season_code=selected_season order by assessed_at desc,id desc limit 1;
 select * into baseline_rating from private.ovr_assessments where identity_id=identity and season_code=selected_season order by assessed_at,id limit 1;
 select coalesce(jsonb_agg(jsonb_build_object('month',s.month,'overall',s.overall,'model_version',s.model_version) order by s.month),'[]') into snapshots from private.ovr_monthly_snapshots s where s.identity_id=identity and s.season_code=selected_season;
 return jsonb_build_object('season',selected_season,'status',case when current_rating.id is not null then 'ready' when exists(select 1 from private.ovr_models where approved) then 'insufficient_sample' else 'pending_model' end,'baseline',case when baseline_rating.id is not null then jsonb_build_object('overall',baseline_rating.overall,'assessed_at',baseline_rating.assessed_at) else null end,'current',case when current_rating.id is not null then jsonb_build_object('overall',current_rating.overall,'assessed_at',current_rating.assessed_at,'model_version',current_rating.model_version,'attributes',current_rating.attributes,'position',current_rating.position_name) else null end,'snapshots',snapshots);
end;$$;
revoke all on function private.validate_ovr_assessment(),private.keep_ovr_history(),private.close_ovr_month(date),private.ovr_comparable_population(text,text,text,text) from public,anon,authenticated;
revoke all on function public.player_ovr_evolution(uuid,text) from public,anon;
grant execute on function public.player_ovr_evolution(uuid,text) to authenticated;
-- Optional monthly close. Empty/no approved assessments => no fabricated snapshots.
-- Cron runs in UTC; 02:10 UTC on the first is safely after midnight in Madrid.
do $$ begin
 if to_regclass('cron.job') is not null then
  execute $schedule$select cron.schedule('oncex-ovr-monthly-snapshots','10 2 1 * *',
   'select private.close_ovr_month((date_trunc(''month'',now() at time zone ''Europe/Madrid'')-interval ''1 month'')::date);')$schedule$;
 else raise notice 'Cron no está activo. No se ha programado el cierre mensual de OVR; activa Cron y programa private.close_ovr_month al integrar el modelo real.';
 end if;
end $$;
commit;
