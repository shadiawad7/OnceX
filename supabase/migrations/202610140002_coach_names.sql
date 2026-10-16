begin;
create function public.can_edit_coach_name(target_coach uuid,target_team uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.team_members tm where tm.team_id=target_team and tm.user_id=target_coach and tm.role_code='coach'
 and (private.has_permission('members.manage',tm.club_id) or private.is_team_admin(tm.team_id) or private.is_team_coach(tm.team_id)));
$$;
create function public.rename_coach(target_coach uuid,target_team uuid,coach_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.can_edit_coach_name(target_coach,target_team) then raise exception 'No puedes editar este entrenador.' using errcode='42501';end if;
 if coach_name is null or length(trim(coach_name)) not between 1 and 120 then raise exception 'Introduce un nombre de entre 1 y 120 caracteres.' using errcode='22023';end if;
 update public.profiles set full_name=trim(coach_name) where id=target_coach;
end;
$$;
revoke all on function public.can_edit_coach_name(uuid,uuid),public.rename_coach(uuid,uuid,text) from public,anon;
grant execute on function public.can_edit_coach_name(uuid,uuid),public.rename_coach(uuid,uuid,text) to authenticated;
commit;
