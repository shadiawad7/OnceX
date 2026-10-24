-- Disposable local DB only. All synthetic assessments and policy fixtures roll back.
begin;
insert into auth.users(id,email) values('91000000-0000-0000-0000-000000000001','ovr-a@example.test'),('91000000-0000-0000-0000-000000000002','ovr-b@example.test'),('91000000-0000-0000-0000-000000000003','ovr-outsider@example.test');
insert into public.clubs(id,name) values('92000000-0000-0000-0000-000000000001','OVR club A'),('92000000-0000-0000-0000-000000000002','OVR club B');
insert into public.teams(id,club_id,name,category) values('93000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','Team A','Juvenil test'),('93000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000002','Team B','Juvenil test');
insert into public.user_roles(user_id,club_id,role_code) values('91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','player'),('91000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000002','player');
insert into public.team_members(team_id,club_id,user_id,role_code) values('93000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','player'),('93000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000002','player');
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000001',true);
do $$ declare data jsonb;begin
 data:=public.player_ovr_evolution(auth.uid());
 if data->>'status'<>'pending_model' or data->'current'<>'null'::jsonb or jsonb_array_length(data->'snapshots')<>0 then raise exception 'Missing model fabricated a rating/history';end if;
 begin perform public.player_ovr_evolution('91000000-0000-0000-0000-000000000002');raise exception 'Other club profile leaked';exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into private.ovr_models(version,approved,minimum_cohort,minimum_minutes,minimum_matches,specification) values('test-only',true,2,90,1,'{"purpose":"rollback test fixture, not a production algorithm"}');
insert into private.ovr_category_mapping values('Juvenil test','Juvenil');
insert into private.ovr_assessments(identity_id,season_code,position_name,category_key,model_version,assessed_at,data_cutoff,overall,attributes,comparable_count,reliability,participated_minutes,participated_matches)
select id,'2026/2027','Delantero','Juvenil','test-only',d.at,d.at,d.ovr,'{"FIN":70,"CRE":70,"IMP":70,"DIS":70,"REG":70,"EFI":70}',2,1,90,1 from private.player_identities cross join(values('2026-08-28T12:00:00Z'::timestamptz,68),('2026-09-30T12:00:00Z'::timestamptz,72),('2026-10-15T12:00:00Z'::timestamptz,79)) d(at,ovr) where profile_id='91000000-0000-0000-0000-000000000001';
select private.close_ovr_month('2026-08-01');
select private.close_ovr_month('2026-09-01');
do $$ begin
 if private.close_ovr_month('2026-09-01')<>0 then raise exception 'Monthly close duplicated';end if;
 begin update private.ovr_monthly_snapshots set overall=99;raise exception 'Historical month overwritten';exception when object_not_in_prerequisite_state then null;end;
 begin delete from private.ovr_monthly_snapshots;raise exception 'Historical month deleted';exception when object_not_in_prerequisite_state then null;end;
 begin perform private.close_ovr_month(date_trunc('month',now())::date);raise exception 'Open month finalized';exception when invalid_parameter_value then null;end;
end $$;
set local role authenticated;
do $$ declare data jsonb;begin
 data:=public.player_ovr_evolution(auth.uid(),'2026/2027');
 if (data->'current'->>'overall')::integer<>79 or (data->'baseline'->>'overall')::integer<>68 or (data->'snapshots'->1->>'overall')::integer<>72 then raise exception 'Evolution used cumulative points or rewrote September';end if;
 data:=public.player_ovr_evolution(auth.uid(),'2025/2026');
 if data->'current'<>'null'::jsonb or jsonb_array_length(data->'snapshots')<>0 then raise exception 'Seasons mixed';end if;
 begin perform private.close_ovr_month('2026-09-01');raise exception 'API client closed month';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Comparable players in separate clubs must both enter the server-side population.
insert into public.team_matches(id,team_id,opponent,played_on,duration,goals_for,goals_against,status,season_code) values('94000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001','Rival',current_date,90,0,0,'confirmed','2026/2027'),('94000000-0000-0000-0000-000000000002','93000000-0000-0000-0000-000000000002','Rival',current_date,90,0,0,'confirmed','2026/2027');
insert into public.match_players(match_id,player_id,player_name,player_position,starter,minutes) values('94000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','A','Delantero',true,90),('94000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000002','B','Delantero',true,90);
do $$ begin
 if (select count(*) from private.ovr_comparable_population('Delantero','Juvenil','2026/2027','test-only'))<>2 then raise exception 'Cohort restricted to own team/club';end if;
 if exists(select 1 from private.ovr_comparable_population('Defensa','Juvenil','2026/2027','test-only')) or exists(select 1 from private.ovr_comparable_population('Delantero','Cadete','2026/2027','test-only')) or exists(select 1 from private.ovr_comparable_population('Delantero','Juvenil','2025/2026','test-only')) then raise exception 'Cohort mixed positions/categories/seasons';end if;
end $$;
rollback;
