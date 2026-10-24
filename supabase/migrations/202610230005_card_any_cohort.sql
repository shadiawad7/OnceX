-- Allow any positive cohort size. A sole player has no relative comparison:
-- each percentile is neutral (50), never an invented top ranking.
begin;
alter table private.ovr_models drop constraint ovr_models_minimum_cohort_check;
alter table private.ovr_models add constraint ovr_models_minimum_cohort_check check(minimum_cohort>=1);
alter table private.ovr_assessments drop constraint ovr_assessments_comparable_count_check;
alter table private.ovr_assessments add constraint ovr_assessments_comparable_count_check check(comparable_count>=1);
update private.ovr_models set minimum_cohort=1 where version='oncex-card-v1';
create or replace function private.refresh_card_season(target_season text) returns integer
language plpgsql security definer set search_path='' as $$
declare policy private.ovr_models; item record; attributes jsonb; reliability numeric; score numeric; weights jsonb; inserted integer:=0;
begin
 -- Serialize computations without exposing the cross-club population to API clients.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('oncex-card-calculation',0));
 select * into policy from private.ovr_models where version='oncex-card-v1' and approved;
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
   'REG',round(50+reliability*(coalesce(99*(item.rr-1+(item.tr-1)/2.0)/nullif(item.population-1,0),50)-50)),
   'EFI',round(50+reliability*(coalesce(99*(item.re-1+(item.te-1)/2.0)/nullif(item.population-1,0),50)-50)));
  weights:=policy.specification->'overall'->item.position_name;
  score:=round((attributes->>'FIN')::numeric*(weights->>0)::numeric+(attributes->>'CRE')::numeric*(weights->>1)::numeric+(attributes->>'IMP')::numeric*(weights->>2)::numeric+(attributes->>'DIS')::numeric*(weights->>3)::numeric+(attributes->>'REG')::numeric*(weights->>4)::numeric+(attributes->>'EFI')::numeric*(weights->>5)::numeric);
  insert into private.ovr_assessments(identity_id,season_code,position_name,category_key,model_version,assessed_at,data_cutoff,overall,attributes,comparable_count,reliability,participated_minutes,participated_matches)
  values(item.identity_id,target_season,item.position_name,item.category_key,policy.version,clock_timestamp(),now(),score,attributes,item.population,reliability,item.minutes,item.matches);
  inserted:=inserted+1;
 end loop;
 return inserted;
end;$$;


select private.refresh_all_cards();
commit;
