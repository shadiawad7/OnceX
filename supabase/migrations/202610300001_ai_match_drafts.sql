begin;
-- Request counters only: no transcript, audio or AI-generated official data.
create table private.ai_match_request_budgets (
 user_id uuid not null references auth.users(id) on delete cascade,
 window_start timestamptz not null,
 requests integer not null check(requests between 1 and 30),
 primary key(user_id,window_start)
);
alter table private.ai_match_request_budgets enable row level security;
revoke all on private.ai_match_request_budgets from public,anon,authenticated;

create function public.ai_match_context(target_team uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare request_count integer; roster jsonb;
begin
 if auth.uid() is null or not private.can_manage_match_team(target_team) then
  raise exception 'No puedes preparar partidos de este equipo.' using errcode='42501';
 end if;
 insert into private.ai_match_request_budgets(user_id,window_start,requests)
 values(auth.uid(),date_trunc('hour',now()),1)
 on conflict(user_id,window_start) do update set requests=private.ai_match_request_budgets.requests+1
 where private.ai_match_request_budgets.requests<30 returning requests into request_count;
 if request_count is null then raise exception 'Has alcanzado el límite de 30 peticiones de IA por hora. Inténtalo más tarde.' using errcode='54000';end if;
 delete from private.ai_match_request_budgets where user_id=auth.uid() and window_start<now()-interval '1 day';
 select coalesce(jsonb_agg(jsonb_build_object('player_id',p.id,'player_name',p.full_name) order by p.id),'[]'::jsonb)
 into roster from public.team_members tm join public.profiles p on p.id=tm.user_id
 where tm.team_id=target_team and tm.role_code='player';
 return jsonb_build_object('players',roster);
end;$$;
revoke all on function public.ai_match_context(uuid) from public,anon;
grant execute on function public.ai_match_context(uuid) to authenticated;
commit;
