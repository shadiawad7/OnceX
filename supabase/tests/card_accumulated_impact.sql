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

-- A: 90 points / 900 minutes. B: 45 points / 450 minutes.
-- C: 90 points / 90 minutes. All are DEL in the same category/season.
update public.match_players set oncex_points=9 where player_id='a3000000-0000-0000-0000-000000000001';
update public.match_players set oncex_points=4.5,minutes=45 where player_id='a3000000-0000-0000-0000-000000000002';
update public.match_players set oncex_points=45 where player_id='a3000000-0000-0000-0000-000000000005';
select private.refresh_card_season('2026/2027');
do $$ declare a record; b record; c record; rating private.ovr_assessments;begin
 select x.* into a from private.card_inputs('2026/2027') x join private.player_identities i on i.id=x.identity_id where i.profile_id='a3000000-0000-0000-0000-000000000001';
 select x.* into b from private.card_inputs('2026/2027') x join private.player_identities i on i.id=x.identity_id where i.profile_id='a3000000-0000-0000-0000-000000000002';
 select x.* into c from private.card_inputs('2026/2027') x join private.player_identities i on i.id=x.identity_id where i.profile_id='a3000000-0000-0000-0000-000000000005';
 if a.imp<>90 or b.imp<>45 or c.imp<>90 then raise exception 'IMP did not use accumulated season points';end if;
 if a.efi<>b.efi or c.efi<=a.efi then raise exception 'EFI did not normalize playing time';end if;
 if a.imp<>c.imp then raise exception 'Equal contribution changed with minutes';end if;
 select * into rating from private.ovr_assessments where model_version='oncex-card-v3' and identity_id=a.identity_id order by assessed_at desc limit 1;
 if rating.id is null or rating.overall<>round((rating.attributes->>'FIN')::numeric*.25+(rating.attributes->>'CRE')::numeric*.15+(rating.attributes->>'IMP')::numeric*.25+(rating.attributes->>'DIS')::numeric*.10+(rating.attributes->>'REG')::numeric*.10+(rating.attributes->>'EFI')::numeric*.15) then raise exception 'OVR weights changed';end if;
 if (select sum(oncex_points) from public.match_players where player_id='a3000000-0000-0000-0000-000000000001')<>90 then raise exception 'Official points modified';end if;
end;$$;
rollback;
