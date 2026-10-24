-- IMP compares accumulated official season points; EFI compares points per playing time.
-- Participation reliability, all other attributes and OVR weights remain unchanged.
-- A new version preserves the meaning of existing immutable assessments/snapshots.
begin;
insert into private.ovr_models(version,approved,minimum_cohort,minimum_minutes,minimum_matches,specification)
select 'oncex-card-v3',approved,minimum_cohort,minimum_minutes,minimum_matches,
 specification||'{"impact_basis":"accumulated_official_season_points; participation via existing reliability"}'::jsonb
from private.ovr_models where version='oncex-card-v2';
create or replace function private.card_inputs(target_season text)
returns table(identity_id uuid,position_name text,category_key text,matches integer,minutes integer,participation numeric,fin numeric,cre numeric,imp numeric,dis numeric,reg numeric,efi numeric)
language sql stable security definer set search_path='' as $$
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

create or replace function private.refresh_card_season(target_season text) returns integer
language plpgsql security definer set search_path='' as $$
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


create or replace function public.player_ovr_evolution(target_player uuid,target_season text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
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
select private.refresh_all_cards();
commit;
