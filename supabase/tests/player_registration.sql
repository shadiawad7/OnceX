-- Apply all migrations; use a disposable database. Fixtures roll back.
begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),('10000000-0000-0000-0000-000000000003');
insert into public.clubs(id,name) values ('20000000-0000-0000-0000-000000000001','Test');
insert into public.teams(id,club_id,name) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Test');
insert into public.user_roles(user_id,club_id,role_code) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','coach'),('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','player'),('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','player');
insert into public.team_members(team_id,club_id,user_id,role_code,coach_id) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','coach',null),('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','player','10000000-0000-0000-0000-000000000001'),('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','player',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ declare affected integer; begin
 if not public.can_edit_player('10000000-0000-0000-0000-000000000002') then raise exception 'Own player denied'; end if;
 if public.can_edit_player('10000000-0000-0000-0000-000000000003') then raise exception 'Unassigned player allowed'; end if;
 update public.profiles set birth_date='2010-05-12',sporting_role='Capitán',preferred_foot='Derecho' where id='10000000-0000-0000-0000-000000000002';
 get diagnostics affected=row_count; if affected<>1 then raise exception 'Edit denied'; end if;
 update public.profiles set sporting_role='Capitán' where id='10000000-0000-0000-0000-000000000003';
 get diagnostics affected=row_count; if affected<>0 then raise exception 'Other player changed'; end if;
end $$;


update public.profiles set jersey_number=9 where id='10000000-0000-0000-0000-000000000002';
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ declare changed integer; begin
 update public.profiles set full_name='Forbidden',jersey_number=99,position='Portero' where id='10000000-0000-0000-0000-000000000002';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Player can edit own profile';end if;
 if private.can_manage_photo('10000000-0000-0000-0000-000000000002') then raise exception 'Player can edit own photo';end if;
 if (select jersey_number from public.profiles where id='10000000-0000-0000-0000-000000000002')<>9 then raise exception 'Coach dorsal was lost';end if;
end $$;
rollback;
