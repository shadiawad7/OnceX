-- Apply all migrations; fixtures roll back. Use a disposable database.
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


reset role;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000004');
insert into public.user_roles(user_id,role_code,club_id) values ('10000000-0000-0000-0000-000000000004','club_admin','20000000-0000-0000-0000-000000000001');
insert into public.clubs(id,name) values ('20000000-0000-0000-0000-000000000002','Other club');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
insert into storage.objects(bucket_id,name) values('club-photos','20000000-0000-0000-0000-000000000001/portrait');
select public.attach_club_photo('20000000-0000-0000-0000-000000000001');
do $$ begin
 if not exists(select 1 from public.clubs where photo_path='20000000-0000-0000-0000-000000000001/portrait') then raise exception 'Club photo not linked';end if;
 begin
  insert into storage.objects(bucket_id,name) values('club-photos','20000000-0000-0000-0000-000000000002/portrait');
  raise exception 'Other club upload allowed';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
 if not exists(select 1 from storage.objects where bucket_id='club-photos') then raise exception 'Player cannot read club photo';end if;
 begin
  perform public.attach_club_photo('20000000-0000-0000-0000-000000000001');raise exception 'Player can edit club photo';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into auth.users(id) values('10000000-0000-0000-0000-000000000005');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='club-photos') then raise exception 'Club photo leaked';end if;
end $$;
rollback;
