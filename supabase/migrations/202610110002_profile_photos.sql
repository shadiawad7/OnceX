begin;
alter table public.profiles add column photo_path text;
create function private.photo_user(object_name text) returns uuid
language sql immutable set search_path='' as $$
 select case when object_name ~ '^[0-9a-fA-F-]{36}/portrait$' and split_part(object_name,'/',1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then split_part(object_name,'/',1)::uuid else null end;
$$;
create function private.can_manage_photo(target_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=target_user) and (
 target_user=auth.uid() or private.has_permission('platform.manage') or public.can_edit_player(target_user)
 or exists(select 1 from public.user_roles ur where ur.user_id=target_user and private.has_permission('members.manage',ur.club_id))
 or exists(select 1 from public.team_members tm where tm.user_id=target_user and private.is_team_admin(tm.team_id)));
$$;
create function private.can_read_photo(target_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select target_user=auth.uid() or private.has_permission('platform.manage')
 or exists(select 1 from public.user_roles ur where ur.user_id=target_user and private.has_permission('clubs.read',ur.club_id));
$$;
revoke all on function private.photo_user(text),private.can_manage_photo(uuid),private.can_read_photo(uuid) from public,anon;
grant execute on function private.photo_user(text),private.can_manage_photo(uuid),private.can_read_photo(uuid) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('profile-photos','profile-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy profile_photos_read on storage.objects for select to authenticated
 using(bucket_id='profile-photos' and private.can_read_photo(private.photo_user(name)));
create policy profile_photos_insert on storage.objects for insert to authenticated
 with check(bucket_id='profile-photos' and private.can_manage_photo(private.photo_user(name)));
create policy profile_photos_update on storage.objects for update to authenticated
 using(bucket_id='profile-photos' and private.can_manage_photo(private.photo_user(name)))
 with check(bucket_id='profile-photos' and private.can_manage_photo(private.photo_user(name)));
create function public.attach_profile_photo(target_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.can_manage_photo(target_user) then raise exception 'No puedes modificar esta foto.' using errcode='42501'; end if;
 if not exists(select 1 from storage.objects where bucket_id='profile-photos' and name=target_user::text||'/portrait') then raise exception 'Primero sube la foto.' using errcode='22023'; end if;
 update public.profiles set photo_path=target_user::text||'/portrait' where id=target_user;
end;
$$;
revoke all on function public.attach_profile_photo(uuid) from public,anon;
grant execute on function public.attach_profile_photo(uuid) to authenticated;
drop function public.club_player_rankings(uuid);
create function public.club_player_rankings(target_club uuid)
returns table(player_id uuid,full_name text,player_position text,team_id uuid,team_name text,category text,oncex_score numeric,photo_path text)
language sql stable security definer set search_path='' as $$
 select p.id,p.full_name,p.position,t.id,t.name,t.category,p.oncex_score,p.photo_path
 from public.team_members tm join public.profiles p on p.id=tm.user_id join public.teams t on t.id=tm.team_id
 where tm.role_code='player' and tm.club_id=target_club and private.has_permission('clubs.read',target_club)
 order by p.oncex_score desc nulls last,p.full_name,p.id,t.name,t.id;
$$;
revoke all on function public.club_player_rankings(uuid) from public,anon;
grant execute on function public.club_player_rankings(uuid) to authenticated;
commit;
