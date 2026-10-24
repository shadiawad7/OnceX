-- Allow a Card from the first confirmed appearance with positive minutes.
-- Keep cohort requirements and reliability protection; never change match points.
begin;
update private.ovr_models
set minimum_matches=1,minimum_minutes=1
where version='oncex-card-v1';
select private.refresh_all_cards();
commit;
