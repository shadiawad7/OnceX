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

delete from public.match_players where player_id<>'a3000000-0000-0000-0000-000000000001';
select private.refresh_card_season('2026/2027');
do $$ begin
 if (select count(*) from private.ovr_assessments where model_version='oncex-card-v1' and comparable_count=1 and overall=50 and attributes='{"FIN":50,"CRE":50,"IMP":50,"DIS":50,"REG":50,"EFI":50}'::jsonb)<>1 then raise exception 'Single-player neutral Card failed';end if;
 if exists(select 1 from public.match_players where match_id::text like 'a4000000-%' and oncex_points<>123) then raise exception 'Match points changed';end if;
end;$$;
rollback;
