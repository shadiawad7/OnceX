begin;
alter table public.clubs add column photo_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('club-photos','club-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy club_photos_read on storage.objects for select to authenticated
 using(bucket_id='club-photos' and private.has_permission('clubs.read',private.photo_user(name)));
create policy club_photos_insert on storage.objects for insert to authenticated
 with check(bucket_id='club-photos' and private.has_permission('members.manage',private.photo_user(name)));
create policy club_photos_update on storage.objects for update to authenticated
 using(bucket_id='club-photos' and private.has_permission('members.manage',private.photo_user(name)))
 with check(bucket_id='club-photos' and private.has_permission('members.manage',private.photo_user(name)));
create function public.attach_club_photo(target_club uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.has_permission('members.manage',target_club) then raise exception 'No puedes modificar la foto de este club.' using errcode='42501';end if;
 if not exists(select 1 from storage.objects where bucket_id='club-photos' and name=target_club::text||'/portrait') then raise exception 'Primero sube la foto del club.' using errcode='22023';end if;
 update public.clubs set photo_path=target_club::text||'/portrait' where id=target_club;
end;
$$;
revoke all on function public.attach_club_photo(uuid) from public,anon;
grant execute on function public.attach_club_photo(uuid) to authenticated;
commit;
