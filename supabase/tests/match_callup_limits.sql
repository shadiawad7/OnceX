-- Local/disposable database only; rolls back all fixtures.
begin;
do $$
declare club uuid:=gen_random_uuid(); team uuid:=gen_random_uuid(); match uuid; cap integer; item record;
begin
 insert into public.clubs(id,name) values(club,'Callup test');
 insert into public.teams(id,club_id,name,category) values(team,club,'Test','Lliga Primera FFCV');
 for item in select * from (values ('Lliga Primera FFCV',18),('Tercera Federación',20),('Primera Federación',23)) v(category,maximum) loop
  update public.teams set category=item.category where id=team;
  cap:=private.match_callup_limit(team,'2026-11-15');
  if cap is distinct from item.maximum then raise exception 'Incorrect cap: %',item.category;end if;
  insert into public.team_matches(team_id,opponent,played_on,duration) values(team,'Test','2026-11-15',90) returning id into match;
  insert into public.match_players(match_id,player_name,starter) select match,'Player '||n,n<=11 from generate_series(1,cap) n;
  begin
   insert into public.match_players(match_id,player_name,starter) values(match,'Extra',false);
   raise exception 'Exceeded limit without rejection';
  exception when invalid_parameter_value then null;end;
  update public.team_matches set status='confirmed',goals_for=0,goals_against=0 where id=match;
 end loop;
 if private.match_callup_limit(team,'2025-11-15') is not null then raise exception 'Invented season rule';end if;
 update public.teams set category='Unknown' where id=team;
 if private.match_callup_limit(team,'2026-11-15') is not null then raise exception 'Invented category rule';end if;
 update public.teams set federation_groups='[{"seasonCode":"2026/2027","competitionName":"Tercera Federación","modality":"MASCULÍ F11"}]' where id=team;
 if private.match_callup_limit(team,'2026-11-15') is distinct from 20 then raise exception 'Group not used';end if;
 update public.teams set federation_groups='[{"seasonCode":"2026/2027","competitionName":"Tercera Federación","modality":"FEMENÍ F11"}]' where id=team;
 if private.match_callup_limit(team,'2026-11-15') is not null then raise exception 'Wrong modality';end if;
 if has_function_privilege('authenticated','private.match_callup_limit(uuid,date)','EXECUTE') or has_table_privilege('authenticated','private.match_callup_rules','SELECT') then raise exception 'Private rules exposed';end if;
end $$;
rollback;
