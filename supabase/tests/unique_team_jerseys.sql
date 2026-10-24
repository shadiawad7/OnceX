-- Disposable local fixtures; all changes roll back.
begin;
insert into auth.users(id,email) select ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'v2-player-'||i||'@example.test' from generate_series(1,15) i;
update public.profiles set full_name='Jugador '||right(id::text,2),position=case when right(id::text,12)::integer=1 then 'Portero' when right(id::text,12)::integer<=5 then 'Defensa' when right(id::text,12)::integer<=8 then 'Centrocampista' else 'Delantero' end;
insert into public.clubs(id,name) values('20000000-0000-0000-0000-000000000001','Lineup test');
insert into public.teams(id,club_id,name) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Own'),('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Other');
insert into public.user_roles(user_id,club_id,role_code) select id,'20000000-0000-0000-0000-000000000001',case when right(id::text,12)::integer in(13,14) then 'coach' else 'player' end from public.profiles;
insert into public.team_members(team_id,club_id,user_id,role_code) select case when right(id::text,12)::integer in(14,15) then '30000000-0000-0000-0000-000000000002'::uuid else '30000000-0000-0000-0000-000000000001'::uuid end,'20000000-0000-0000-0000-000000000001',id,case when right(id::text,12)::integer in(13,14) then 'coach' else 'player' end from public.profiles;


update public.profiles set jersey_number=7 where id='10000000-0000-0000-0000-000000000001';
do $$ begin
 begin update public.profiles set jersey_number=7 where id='10000000-0000-0000-0000-000000000002';raise exception 'Duplicate jersey accepted';exception when unique_violation then null;end;
end $$;
-- Same number in another team is valid.
update public.profiles set jersey_number=7 where id='10000000-0000-0000-0000-000000000015';
-- Adding that player to the first team is blocked too.
do $$ begin
 begin insert into public.team_members(team_id,club_id,user_id,role_code) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000015','player');raise exception 'Conflicting team assignment accepted';exception when unique_violation then null;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000013',true);
do $$ begin
 if public.team_jersey_available('30000000-0000-0000-0000-000000000001',7) then raise exception 'Occupied number reported free';end if;
 if not public.team_jersey_available('30000000-0000-0000-0000-000000000001',8) then raise exception 'Free number reported taken';end if;
 if not public.team_jersey_available('30000000-0000-0000-0000-000000000001',7,'10000000-0000-0000-0000-000000000001') then raise exception 'Editing unchanged own jersey blocked';end if;
 begin perform public.team_jersey_available('30000000-0000-0000-0000-000000000002',7);raise exception 'Foreign team checked';exception when insufficient_privilege then null;end;
end $$;
rollback;
