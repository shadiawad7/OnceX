begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- Abort rather than overwrite a cron job or apply under an unexpected owner.
do $preconditions$
begin
 if current_user<>'postgres' then raise exception 'Apply this migration as postgres';end if;
 if to_regprocedure('private.can_manage_match_team(uuid)') is null then raise exception 'Missing match authorization prerequisite';end if;
 -- Serialize this migration, without privileged locks/writes on managed cron tables.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('oncex:202610300001:ai-cleanup',0));
 if to_regclass('private.ai_match_cleanup_job') is not null then
  raise exception 'AI cleanup registration already exists; review before applying';
 end if;
 if exists(select 1 from cron.job where jobname='oncex-ai-draft-cleanup'
  or (database=current_database() and command='select private.cleanup_ai_match_requests();')) then
  raise exception 'AI cleanup job already exists; review before applying';
 end if;
end;$preconditions$;
-- Request counters only: no transcript, audio or AI-generated official data.
create table private.ai_match_request_budgets (
 user_id uuid not null references auth.users(id) on delete cascade,
 window_start timestamptz not null,
 requests integer not null check(requests between 1 and 30),
 primary key(user_id,window_start)
);
alter table private.ai_match_request_budgets enable row level security;
revoke all on private.ai_match_request_budgets from public,anon,authenticated,service_role;

create function public.ai_match_context(target_team uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare request_count integer; roster jsonb;
begin
 if auth.uid() is null or not private.can_manage_match_team(target_team) then
  raise exception 'No puedes preparar partidos de este equipo.' using errcode='42501';
 end if;
 insert into private.ai_match_request_budgets(user_id,window_start,requests)
 values(auth.uid(),(date_trunc('hour',now() at time zone 'UTC') at time zone 'UTC'),1)
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

-- Server-side deduplication. Results are private, temporary review drafts, never official stats.
create table private.ai_match_requests (
 user_id uuid not null references auth.users(id) on delete cascade,
 team_id uuid not null references public.teams(id) on delete cascade,
 input_hash text not null check(input_hash ~ '^[0-9a-f]{64}$'),
 lease_id uuid not null default gen_random_uuid() unique,
 created_at timestamptz not null default now(),
 response_status integer check(response_status between 200 and 599),
 response_body jsonb,
 primary key(user_id,team_id,input_hash),
 check(response_body is null or octet_length(response_body::text)<=1048576)
);
create index ai_match_requests_expiry on private.ai_match_requests(created_at);
alter table private.ai_match_requests enable row level security;
revoke all on private.ai_match_requests from public,anon,authenticated,service_role;

create function public.ai_match_request_start(target_team uuid,input_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare claimed uuid; existing private.ai_match_requests; context jsonb;
begin
 if auth.uid() is null or not private.can_manage_match_team(target_team) then
  raise exception 'No puedes preparar partidos de este equipo.' using errcode='42501';
 end if;
 if input_hash is null or input_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid request hash' using errcode='22023';end if;
 insert into private.ai_match_requests(user_id,team_id,input_hash)
 values(auth.uid(),target_team,input_hash)
 on conflict on constraint ai_match_requests_pkey do nothing returning lease_id into claimed;
 if claimed is null then
  select * into existing from private.ai_match_requests r
   where r.user_id=auth.uid() and r.team_id=target_team and r.input_hash=ai_match_request_start.input_hash;
  -- Cleanup may have removed the old row after INSERT observed a conflict.
  -- Fail closed: never create a replacement processing attempt in this call.
  if not found then return jsonb_build_object('state','expired');end if;
  if existing.created_at<now()-interval '24 hours' then return jsonb_build_object('state','expired');end if;
  if existing.response_status is not null then
   return jsonb_build_object('state','completed','status',existing.response_status,'body',existing.response_body,'players',(select coalesce(jsonb_agg(jsonb_build_object('player_id',p.id,'player_name',p.full_name)),'[]'::jsonb) from public.team_members tm join public.profiles p on p.id=tm.user_id where tm.team_id=target_team and tm.role_code='player'));
  end if;
  return jsonb_build_object('state','processing');
 end if;
 -- Only the winning reservation consumes quota and obtains the roster.
 context:=public.ai_match_context(target_team);
 return jsonb_build_object('state','claimed','lease_id',claimed,'players',context->'players');
end;$$;
revoke all on function public.ai_match_request_start(uuid,text) from public,anon;
grant execute on function public.ai_match_request_start(uuid,text) to authenticated;

-- Only the Edge Function can publish results, never a mobile caller.
create function public.ai_match_request_finish(request_lease uuid,status_code integer,result_body jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if status_code is null or status_code not between 200 and 599 or result_body is null or jsonb_typeof(result_body)<>'object' then
  raise exception 'Invalid result' using errcode='22023';end if;
 update private.ai_match_requests set response_status=status_code,response_body=result_body
 where lease_id=request_lease and response_status is null
 and created_at>=now()-interval '24 hours';
 return found;
end;$$;
revoke all on function public.ai_match_request_finish(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.ai_match_request_finish(uuid,integer,jsonb) to service_role;

-- No takeover of an abandoned reservation: a crash must never repeat a paid call.
create function private.cleanup_ai_match_requests() returns void
language sql security definer set search_path='' as $$
 update private.ai_match_requests set response_body=null where created_at<now()-interval '24 hours' and response_body is not null;
 delete from private.ai_match_requests where created_at<now()-interval '48 hours';
$$;
revoke all on function private.cleanup_ai_match_requests() from public,anon,authenticated,service_role;
-- The two-argument API always INSERTs an unnamed job, never upserts another job.
-- Keep its immutable ID in our own table; do not write to cron.job directly.
create table private.ai_match_cleanup_job (
 singleton boolean primary key default true check(singleton),
 job_id bigint not null unique,
 created_at timestamptz not null default now()
);
alter table private.ai_match_cleanup_job enable row level security;
revoke all on private.ai_match_cleanup_job from public,anon,authenticated,service_role;
insert into private.ai_match_cleanup_job(singleton,job_id)
 values(true,cron.schedule('17 * * * *','select private.cleanup_ai_match_requests();'));

commit;
