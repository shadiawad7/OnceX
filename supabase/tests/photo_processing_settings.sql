-- Disposable database only, after all migrations. All changes roll back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values
 ('80000000-0000-0000-0000-000000000001'),
 ('80000000-0000-0000-0000-000000000002');
insert into public.user_roles(user_id,role_code,club_id)
 values('80000000-0000-0000-0000-000000000001','super_admin',null);

set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-0000-0000-000000000001',true);
do $$ begin
 if (select count(*) from public.photo_processing_settings)<>1 then raise exception 'Superadmin cannot read singleton';end if;
 update public.photo_processing_settings set background_removal_enabled=false where id=true;
 if not found then raise exception 'Superadmin update denied';end if;
 if (select background_removal_enabled from public.photo_processing_settings where id=true) then raise exception 'Switch not saved';end if;
 begin
  delete from public.photo_processing_settings;
  raise exception 'Singleton deletion allowed';
 exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','80000000-0000-0000-0000-000000000002',true);
do $$ begin
 if exists(select 1 from public.photo_processing_settings) then raise exception 'Settings visible to nonadmin';end if;
 update public.photo_processing_settings set background_removal_enabled=true where id=true;
 if found then raise exception 'Nonadmin changed switch';end if;
end $$;
reset role;
set local role service_role;
do $$ begin
 if (select count(*) from public.photo_processing_settings)<>1 then raise exception 'Service cannot read switch';end if;
 if (select background_removal_enabled from public.photo_processing_settings where id=true) then raise exception 'Nonadmin changed switch';end if;
end $$;
reset role;
rollback;
