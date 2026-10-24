-- Synthetic local fixtures only; rollback leaves no player, match or assessment data.
begin;
insert into public.clubs(id,name) values('a1000000-0000-0000-0000-000000000001','Card A'),('a1000000-0000-0000-0000-000000000002','Card B');
insert into public.teams(id,club_id,name,category)
select ('a2000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,('a1000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'Team','Card Juvenil' from generate_series(1,2)n;
insert into auth.users(id,email) select ('a3000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'card'||n||'@test.invalid' from generate_series(1,6)n;
insert into private.player_identities(profile_id) select id from public.profiles where id::text like 'a3000000-%';
insert into public.team_matches(id,team_id,opponent,played_on,duration,status,season_code,goals_for,goals_against)
select ('a4000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,('a2000000-0000-0000-0000-'||lpad((case when n<=10 then 1 else 2 end)::text,12,'0'))::uuid,'Rival',current_date-(n%10),90,'confirmed','2026/2027',10,0 from generate_series(1,20)n;
insert into public.match_players(match_id,player_id,player_name,player_position,starter,minutes,goals,assists,clean_sheet,oncex_points)
select m.id,p.id,'Player','Delantero',true,
 case when p.id::text like '%000005' then 45 else 90 end,
 case when p.id::text like '%000005' then 5 when p.id::text like '%000001' then 2 else 0 end,
 0,false,123
from public.team_matches m cross join public.profiles p where p.id::text like 'a3000000-%' and p.id::text not like '%000006'
and m.id::text like 'a4000000-%'
and m.team_id=('a2000000-0000-0000-0000-'||lpad((case when right(p.id::text,1)::integer<=2 then 1 else 2 end)::text,12,'0'))::uuid
and (p.id::text not like '%000005' or right(m.id::text,2)::integer<=12);
select private.refresh_card_season('2026/2027');
select set_config('request.jwt.claim.sub','a3000000-0000-0000-0000-000000000001',true);
do $$ begin
 if public.player_ovr_evolution(auth.uid(),'2026/2027')->>'status'<>'ready' then raise exception 'Computed Card not connected to RPC';end if;
end;$$;
do $$ declare a private.ovr_assessments; b private.ovr_assessments; count_before integer; position_label text; weight_vector jsonb;begin
 if (select count(*) from private.card_inputs('2026/2027'))<>5 then raise exception 'Population inputs missing';end if;
 select r.* into a from private.ovr_assessments r join private.player_identities i on i.id=r.identity_id where i.profile_id='a3000000-0000-0000-0000-000000000001' order by assessed_at desc limit 1;
 if a.id is null or a.comparable_count<>5 or a.reliability<>1 then raise exception 'Cross-club cohort/reliability failed';end if;
 select r.* into b from private.ovr_assessments r join private.player_identities i on i.id=r.identity_id where i.profile_id='a3000000-0000-0000-0000-000000000005' order by assessed_at desc limit 1;
 if b.reliability<>0.1 or (b.attributes->>'FIN')::integer>55 then raise exception 'Small sample exaggerated';end if;
 if a.overall<>round((a.attributes->>'FIN')::numeric*.25+(a.attributes->>'CRE')::numeric*.15+(a.attributes->>'IMP')::numeric*.25+(a.attributes->>'DIS')::numeric*.1+(a.attributes->>'REG')::numeric*.1+(a.attributes->>'EFI')::numeric*.15) then raise exception 'DEL OVR weights wrong';end if;
 if exists(select 1 from public.match_players where match_id::text like 'a4000000-%' and oncex_points<>123) then raise exception 'Match points changed';end if;
 -- Two tied zero-goal peers must have identical FIN, not arbitrary ranks.
 if (select count(distinct r.attributes->>'FIN') from private.ovr_assessments r join private.player_identities i on i.id=r.identity_id where i.profile_id in ('a3000000-0000-0000-0000-000000000003','a3000000-0000-0000-0000-000000000004'))<>1 then raise exception 'Ties unequal';end if;
 -- The match update hook recalculates from the corrected statistics.
 insert into public.match_players(match_id,player_id,player_name,player_position,starter,minutes)
 select id,'a3000000-0000-0000-0000-000000000006','Keeper','Portero',true,90 from public.team_matches where id::text like 'a4000000-%';
 select count(*) into count_before from private.ovr_assessments;
 update public.team_matches set revision=revision+1 where id='a4000000-0000-0000-0000-000000000001';
 if (select count(*) from private.ovr_assessments)<>count_before+5 then raise exception 'Match confirmation hook failed';end if;
 -- MED/DEF use their supplied weight vectors too.
 for position_label,weight_vector in select key,value from jsonb_each((select specification->'overall' from private.ovr_models where version='oncex-card-v1')) loop
  update public.match_players set player_position=position_label where player_id::text like 'a3000000-%' and player_position<>'Portero';
  perform private.refresh_card_season('2026/2027');
  select r.* into a from private.ovr_assessments r join private.player_identities i on i.id=r.identity_id where i.profile_id='a3000000-0000-0000-0000-000000000001' order by assessed_at desc limit 1;
  if a.overall<>round((a.attributes->>'FIN')::numeric*(weight_vector->>0)::numeric+(a.attributes->>'CRE')::numeric*(weight_vector->>1)::numeric+(a.attributes->>'IMP')::numeric*(weight_vector->>2)::numeric+(a.attributes->>'DIS')::numeric*(weight_vector->>3)::numeric+(a.attributes->>'REG')::numeric*(weight_vector->>4)::numeric+(a.attributes->>'EFI')::numeric*(weight_vector->>5)::numeric) then raise exception 'Position weights failed: %',position_label;end if;
 end loop;
 update public.match_players set player_position='Delantero' where player_id::text like 'a3000000-%' and player_position<>'Portero';
 perform private.refresh_card_season('2026/2027');
 -- Wrong position, category or season cannot join the comparison.
 update public.match_players set player_position='Defensa' where player_id='a3000000-0000-0000-0000-000000000004';
 select count(*) into count_before from private.ovr_assessments;
 perform private.refresh_card_season('2026/2027');
 if (select count(*) from private.ovr_assessments)<>count_before then raise exception 'Insufficient cohort produced ratings';end if;
 if exists(select 1 from private.card_inputs('2025/2026')) then raise exception 'Seasons mixed';end if;
 begin perform private.close_ovr_month(date_trunc('month',now())::date);raise exception 'Open month closed';exception when invalid_parameter_value then null;end;
end;$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a3000000-0000-0000-0000-000000000001',true);
do $$ declare result jsonb;begin
 result:=public.player_ovr_evolution(auth.uid(),'2026/2027');
 if result->>'status'<>'insufficient_sample' or result->'current'<>'null'::jsonb then raise exception 'Stale rating displayed after cohort loss';end if;
 begin perform private.refresh_card_season('2026/2027');raise exception 'Client calculated arbitrary ratings';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
