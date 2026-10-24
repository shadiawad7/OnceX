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

select set_config('request.jwt.claim.sub','a3000000-0000-0000-0000-000000000001',true);
-- Equal participation and other stats: only official points differ.
update public.match_players set goals=0,assists=0,oncex_points=case when player_id='a3000000-0000-0000-0000-000000000002' then 11 else 9 end
where match_id::text like 'a4000000-%';
select private.refresh_card_season('2026/2027');
do $$ declare a private.ovr_assessments; b private.ovr_assessments; before_points numeric; input_row record;begin
 select r.* into a from private.ovr_assessments r join private.player_identities i on i.id=r.identity_id where r.model_version='oncex-card-v2' and i.profile_id='a3000000-0000-0000-0000-000000000001' order by assessed_at desc limit 1;
 select r.* into b from private.ovr_assessments r join private.player_identities i on i.id=r.identity_id where r.model_version='oncex-card-v2' and i.profile_id='a3000000-0000-0000-0000-000000000002' order by assessed_at desc limit 1;
 if a.id is null or b.id is null or (b.attributes->>'IMP')::integer<=(a.attributes->>'IMP')::integer or (b.attributes->>'EFI')::integer<=(a.attributes->>'EFI')::integer or b.overall<a.overall then raise exception 'Better points with equal participation produced worse Card';end if;
 if (a.attributes->>'REG')::integer<>99 then raise exception 'Full participation REG not 99';end if;
 select c.* into input_row from private.card_inputs('2026/2027') c join private.player_identities i on i.id=c.identity_id where i.profile_id='a3000000-0000-0000-0000-000000000005';
 if input_row.imp=input_row.efi then raise exception 'IMP and EFI ignored participation';end if;
 select sum(oncex_points) into before_points from public.match_players;
 perform private.refresh_card_season('2026/2027');
 if before_points<>(select sum(oncex_points) from public.match_players) then raise exception 'Card modified official points';end if;
 if public.player_ovr_evolution('a3000000-0000-0000-0000-000000000001','2026/2027')->'current'->>'model_version'<>'oncex-card-v2' then raise exception 'RPC still uses old Card';end if;
end;$$;
insert into public.match_players(match_id,player_id,player_name,player_position,starter,minutes,oncex_points)
select id,'a3000000-0000-0000-0000-000000000006','Keeper','Portero',true,90,0 from public.team_matches where id::text like 'a4000000-%';
-- Exact REG example: 800/1000 minutes and 9/10 appearances => 83 base.
update public.team_matches set duration=100 where team_id='a2000000-0000-0000-0000-000000000001';
update public.match_players set minutes=case when match_id='a4000000-0000-0000-0000-000000000010' then 0 when match_id='a4000000-0000-0000-0000-000000000001' then 80 else 90 end where player_id='a3000000-0000-0000-0000-000000000001';
do $$ declare r numeric;begin
 select c.reg into r from private.card_inputs('2026/2027') c join private.player_identities i on i.id=c.identity_id where i.profile_id='a3000000-0000-0000-0000-000000000001';
 if r<>83 then raise exception 'REG base must be 83, got %',r;end if;
end;$$;
-- A lone player uses neutral percentiles, but OVR remains exactly the weighted sum.
delete from public.match_players where player_id<>'a3000000-0000-0000-0000-000000000001';
select private.refresh_card_season('2026/2027');
do $$ declare a private.ovr_assessments;begin
 select * into a from private.ovr_assessments where model_version='oncex-card-v2' order by assessed_at desc limit 1;
 if a.comparable_count<>1 or a.overall<>round((a.attributes->>'FIN')::numeric*.25+(a.attributes->>'CRE')::numeric*.15+(a.attributes->>'IMP')::numeric*.25+(a.attributes->>'DIS')::numeric*.10+(a.attributes->>'REG')::numeric*.10+(a.attributes->>'EFI')::numeric*.15) then raise exception 'Singleton OVR does not match attributes';end if;
end;$$;
rollback;
