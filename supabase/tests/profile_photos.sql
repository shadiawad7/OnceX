-- Apply all migrations first. Run against a disposable database; fixtures roll back.
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


insert into storage.objects(bucket_id,name) values ('profile-photos','10000000-0000-0000-0000-000000000002/portrait');
select public.attach_profile_photo('10000000-0000-0000-0000-000000000002');
do $$ begin
 if not exists(select 1 from public.club_player_rankings('20000000-0000-0000-0000-000000000001') where photo_path='10000000-0000-0000-0000-000000000002/portrait') then raise exception 'Photo absent from ranking';end if;
 if private.photo_user('invalid/portrait') is not null then raise exception 'Invalid path accepted';end if;
 begin
  insert into storage.objects(bucket_id,name) values ('profile-photos','10000000-0000-0000-0000-000000000003/portrait');
  raise exception 'Unassigned player upload allowed';
 exception when insufficient_privilege then null;end;
 begin
  perform public.attach_profile_photo('10000000-0000-0000-0000-000000000003');
  raise exception 'Unassigned player photo linked';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000004');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='profile-photos') then raise exception 'Photo leaked outside club';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$ begin
 if not exists(select 1 from storage.objects where name='10000000-0000-0000-0000-000000000002/portrait') then raise exception 'Club member cannot read photo';end if;
 begin
  update storage.objects set name='10000000-0000-0000-0000-000000000003/portrait' where name='10000000-0000-0000-0000-000000000002/portrait';
  if found then raise exception 'Other player photo overwritten';end if;
 exception when insufficient_privilege then null;end;
end $$;
rollback;
