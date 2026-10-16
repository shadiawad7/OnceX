begin;
alter table public.teams add column plan_code text not null default 'basic' check(plan_code in ('basic','pro'));
-- Coaches may edit sporting details, but changing a plan requires club management.
create function private.check_team_plan() returns trigger language plpgsql set search_path='' as $$
begin
 if (TG_OP='UPDATE' and new.plan_code is distinct from old.plan_code)
 or (TG_OP='INSERT' and new.plan_code<>'basic') then
  if not private.has_permission('members.manage',new.club_id) then
   raise exception 'Solo el superadmin o administrador del club puede asignar el plan.' using errcode='42501';
  end if;
 end if;
 return new;
end;
$$;
create trigger team_plan_management before insert or update on public.teams for each row execute function private.check_team_plan();
commit;
