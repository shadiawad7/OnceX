begin;

-- One global switch, readable by the superadmin dashboard and service role.
create table public.photo_processing_settings (
 id boolean primary key default true check (id),
 background_removal_enabled boolean not null default true
);
insert into public.photo_processing_settings(id,background_removal_enabled) values(true,true);
alter table public.photo_processing_settings enable row level security;
revoke all on public.photo_processing_settings from anon,authenticated;
grant select on public.photo_processing_settings to authenticated;
grant update(background_removal_enabled) on public.photo_processing_settings to authenticated;
grant select on public.photo_processing_settings to service_role;

create policy photo_processing_settings_admin_read on public.photo_processing_settings
 for select to authenticated using (private.has_permission('platform.manage'));
create policy photo_processing_settings_admin_update on public.photo_processing_settings
 for update to authenticated using (private.has_permission('platform.manage'))
 with check (private.has_permission('platform.manage'));

commit;
