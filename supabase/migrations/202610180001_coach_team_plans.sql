begin;
-- RLS still requires management of this exact team. Coaches may update the plan
-- only for a team where they are already members, without moving its club.
create or replace function private.check_team_plan() returns trigger
language plpgsql set search_path='' as $$
begin
 if (TG_OP='UPDATE' and new.plan_code is distinct from old.plan_code)
 or (TG_OP='INSERT' and new.plan_code<>'basic') then
  if private.has_permission('members.manage',new.club_id) then return new; end if;
  if TG_OP='UPDATE' then
   if new.club_id=old.club_id and new.id=old.id and private.is_team_coach(old.id) then return new; end if;
  end if;
  raise exception 'Solo los administradores o entrenadores asignados al equipo pueden cambiar su plan.' using errcode='42501';
 end if;
 return new;
end;
$$;
commit;
