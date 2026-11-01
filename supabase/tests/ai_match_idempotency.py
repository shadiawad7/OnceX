"""Local disposable Docker database ONLY. Real multi-session PostgreSQL contention tests.
Usage: python3 supabase/tests/ai_match_idempotency.py --container oncex-ai-idempotency-db
Requires all migrations. Seeds existing synthetic fixtures; destroys no real databases.
"""
import argparse, concurrent.futures, json, pathlib, subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--container', required=True)
args = parser.parse_args()
assert args.container.startswith('oncex-ai-idempotency-'), 'Disposable test container required'
docker = ['docker', '--host', 'unix:///Users/xavineta/.docker/run/docker.sock']
info = json.loads(subprocess.check_output(docker+['inspect', args.container], text=True))[0]
assert info['HostConfig']['NetworkMode'] == 'none' and not info['HostConfig'].get('PortBindings')
command = docker+['exec', '-i', args.container, 'psql', '-h', '/tmp', '-U', 'postgres', '-X', '-At', '-v', 'ON_ERROR_STOP=1']

def run(source, expected=True):
    result = subprocess.run(command, input=source, text=True, capture_output=True)
    if expected and result.returncode:
        raise AssertionError(result.stderr)
    return result

fixture = pathlib.Path(__file__).with_name('ai_match_drafts.sql').read_text().split('set local role authenticated;')[0]
run(fixture+'commit;')
team = '33000000-0000-0000-0000-000000000001'
user = '11000000-0000-0000-0000-000000000001'

def claim(digest='a'*64, target=team):
    result = run(f"begin;set local role authenticated;select set_config('request.jwt.claim.sub','{user}',true);select public.ai_match_request_start('{target}','{digest}');commit;")
    return next(json.loads(line) for line in result.stdout.splitlines() if line.startswith('{'))

with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
    results = list(pool.map(lambda _: claim(), range(16)))
winners = [r for r in results if r['state'] == 'claimed']
assert len(winners) == 1 and sum(r['state'] == 'processing' for r in results) == 15, results
assert run(f"select sum(requests) from private.ai_match_request_budgets where user_id='{user}';").stdout.strip() == '1'
lease = winners[0]['lease_id']
assert run(f"set role authenticated;select public.ai_match_request_finish('{lease}',200,'{{}}');", False).returncode != 0
assert run("set role anon;select public.ai_match_request_start('"+team+"','"+'b'*64+"');", False).returncode != 0
assert run(f"select has_table_privilege('authenticated','private.ai_match_requests','select');").stdout.strip() == 'f'
assert run(f"set role service_role;select public.ai_match_request_finish('{lease}',200,'{{\"draft\":{{\"test\":true}}}}');").stdout.strip().endswith('t')
replay = claim()
assert replay['state'] == 'completed' and replay['status'] == 200 and replay['body'] == {'draft': {'test': True}}
assert run(f"select sum(requests) from private.ai_match_request_budgets where user_id='{user}';").stdout.strip() == '1'
# Completion is immutable, even to repeated server-side completion attempts.
assert run(f"set role service_role;select public.ai_match_request_finish('{lease}',503,'{{}}');").stdout.strip().endswith('f')
assert claim()['body'] == replay['body']
# Current authorization is required even for previously completed cached requests.
run(f"begin;delete from public.team_members where user_id='{user}' and team_id='{team}' and role_code='coach';commit;")
assert run(f"begin;set local role authenticated;select set_config('request.jwt.claim.sub','{user}',true);select public.ai_match_request_start('{team}','{'a'*64}');",False).returncode != 0
run(f"insert into public.team_members(team_id,club_id,user_id,role_code) values('{team}','22000000-0000-0000-0000-000000000001','{user}','coach');")
# Expired or abandoned work is never taken over and reprocessed.
run(f"update private.ai_match_requests set created_at=now()-interval '25 hours' where lease_id='{lease}';")
assert claim()['state'] == 'expired'
run('select private.cleanup_ai_match_requests();')
assert run(f"select response_body is null from private.ai_match_requests where lease_id='{lease}';").stdout.strip() == 't'
assert claim()['state'] == 'expired'
other = claim('b'*64)
assert other['state'] == 'claimed'
assert claim('b'*64)['state'] == 'processing'
run(f"set role service_role;select public.ai_match_request_finish('{other['lease_id']}',503,'{{\"error\":\"provider failed\"}}');")
assert claim('b'*64)['status'] == 503
assert run(f"select sum(requests) from private.ai_match_request_budgets where user_id='{user}';").stdout.strip() == '2'
# A late backend response cannot repopulate an expired cache.
late = claim('c'*64)
run(f"update private.ai_match_requests set created_at=now()-interval '25 hours' where lease_id='{late['lease_id']}';")
assert run(f"set role service_role;select public.ai_match_request_finish('{late['lease_id']}',200,'{{}}');").stdout.strip().endswith('f')
assert claim('c'*64)['state'] == 'expired'
# Client timezone preferences cannot create a second hourly budget window.
for timezone in ['UTC', 'Asia/Kathmandu']:
    run(f"begin;set local role authenticated;set local timezone='{timezone}';select set_config('request.jwt.claim.sub','{user}',true);select public.ai_match_context('{team}');commit;")
assert run(f"select count(*) from private.ai_match_request_budgets where user_id='{user}';").stdout.strip() == '1'
for table in ['ai_match_requests','ai_match_request_budgets']:
    assert run(f"select has_table_privilege('service_role','private.{table}','select');").stdout.strip() == 'f'
print('PASS: 16 sessions, 1 claim/quota; replay; permissions/RLS; authorization; expiry/cleanup; immutable finish; no takeover; late completion rejected; UTC quota invariant across timezones; no direct service-role table access. Hosted cron/migration concurrency tested separately in ai_match_hosted_permissions.py.')
