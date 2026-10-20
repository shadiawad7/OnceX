begin;
-- Deliberately require empty containers. Account deletion is global, never implicit.
create or replace function public.admin_delete_hierarchy(target_kind text, target_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_permission('platform.manage') then
  raise exception 'Solo el superadmin puede eliminar registros.' using errcode='42501';
 end if;
 if target_kind='club' then
  perform 1 from public.clubs where id=target_id for update;
  if not found then raise exception 'El club ya no existe.'; end if;
  if exists(select 1 from public.teams where club_id=target_id) then
   raise exception 'Elimina primero los equipos del club.';
  end if;
  delete from public.clubs where id=target_id;
 elsif target_kind='team' then
  perform 1 from public.teams where id=target_id for update;
  if not found then raise exception 'El equipo ya no existe.'; end if;
  if exists(select 1 from public.team_members where team_id=target_id) then
   raise exception 'Elimina primero los entrenadores y jugadores del equipo.';
  end if;
  delete from public.teams where id=target_id;
 elsif target_kind in ('coach','player') then
  if target_id=auth.uid() or exists(select 1 from public.user_roles where user_id=target_id and role_code not in ('coach','player')) then
   raise exception 'No puedes eliminar tu cuenta ni una cuenta con roles administrativos.' using errcode='42501';
  end if;
  perform 1 from public.profiles where id=target_id for update;
  if not found then raise exception 'La cuenta ya no existe.'; end if;
  if not exists(select 1 from public.user_roles where user_id=target_id and role_code=target_kind) then
   raise exception 'La cuenta no corresponde al tipo indicado.' using errcode='22023';
  end if;
  if exists(select 1 from public.team_members where coach_id=target_id) then
   raise exception 'Reasigna o elimina primero los jugadores de este entrenador.';
  end if;
  -- Explicit confirmation in the UI states this removes the account in all teams.
  -- Supabase Storage may reject deletion of owners; its objects must then be
  -- removed using the Storage API, never by deleting storage metadata with SQL.
  delete from auth.users where id=target_id;
 else
  raise exception 'Tipo de registro no válido.' using errcode='22023';
 end if;
end;
$$;
revoke all on function public.admin_delete_hierarchy(text,uuid) from public,anon;
grant execute on function public.admin_delete_hierarchy(text,uuid) to authenticated;
commit;
