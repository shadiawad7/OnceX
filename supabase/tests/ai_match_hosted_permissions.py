"""Disposable local PG only. Reproduce hosted cron ownership and restricted postgres.
Requires pre-AI migrations and cron owned by supabase_admin; postgres NOSUPERUSER,
SELECT-only on cron.job. Never run against a linked/remote database.
"""
import argparse, concurrent.futures, json, pathlib, subprocess
parser=argparse.ArgumentParser();parser.add_argument('--container',required=True);args=parser.parse_args()
assert args.container.startswith('oncex-ai-idempotency-')
docker=['docker','--host','unix:///Users/xavineta/.docker/run/docker.sock']
info=json.loads(subprocess.check_output(docker+['inspect',args.container],text=True))[0]
assert info['HostConfig']['NetworkMode']=='none' and not info['HostConfig'].get('PortBindings')
base=docker+['exec','-i',args.container,'psql','-h','/tmp','-U','postgres','-X','-At','-v','ON_ERROR_STOP=1']
def run(source,check=True):
    p=subprocess.run(base,input=source,text=True,capture_output=True)
    if check and p.returncode:raise AssertionError(p.stderr)
    return p
root=pathlib.Path(__file__).resolve().parents[2]
migration=(root/'supabase/migrations/202610300001_ai_match_drafts.sql').read_text()
assert run("select not rolsuper and not rolbypassrls from pg_roles where rolname=current_user;").stdout.strip()=='t'
assert run("select relowner::regrole from pg_class where oid='cron.job'::regclass;").stdout.strip()=='supabase_admin'
assert run("select has_table_privilege('cron.job','SELECT') and not has_table_privilege('cron.job','UPDATE') and not has_table_privilege('cron.job','INSERT') and not has_table_privilege('cron.job','DELETE');").stdout.strip()=='t'
# Exactly the hosted failure, before any CREATE; no tables or history survive.
failed=run('begin;lock table cron.job in share row exclusive mode;commit;',False)
assert failed.returncode!=0 and 'permission denied for table job' in failed.stderr
assert run("select to_regclass('private.ai_match_requests') is null and not exists(select 1 from supabase_migrations.schema_migrations where version='202610300001');").stdout.strip()=='t'
# Legacy named collision aborts atomically, preserving its command.
run("select cron.schedule('oncex-ai-draft-cleanup','0 0 * * *','select 42;');")
failed=run(migration,False)
assert failed.returncode!=0 and 'AI cleanup job already exists' in failed.stderr
assert run("select command from cron.job where jobname='oncex-ai-draft-cleanup';").stdout.strip()=='select 42;'
assert run("select to_regclass('private.ai_match_requests') is null;").stdout.strip()=='t'
run("select cron.unschedule(jobid) from cron.job where jobname='oncex-ai-draft-cleanup';")
# API scheduling has a privilege elevation internal to pg_cron, not a caller table grant.
original=json.loads(run("select coalesce(json_agg(j order by jobid),'[]') from cron.job j;").stdout)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    first=pool.submit(run,migration,False)
    second=pool.submit(run,migration,False)
    writer=pool.submit(run,"select cron.schedule('independent-concurrent-job','0 0 * * *','select 99;');")
    results=[first.result(),second.result()];writer.result()
assert sorted(p.returncode for p in results)==[0,3], [p.stderr for p in results]
assert any('AI cleanup registration already exists' in p.stderr for p in results)
rows=json.loads(run("select json_agg(j order by jobid) from cron.job j;").stdout)
for old in original:assert next(r for r in rows if r['jobid']==old['jobid'])==old
assert next(r for r in rows if r['jobname']=='independent-concurrent-job')['command']=='select 99;'
job=json.loads(run("select row_to_json(j) from cron.job j join private.ai_match_cleanup_job c on c.job_id=j.jobid;").stdout)
assert job['jobname'] is None and job['username']=='postgres' and job['schedule']=='17 * * * *'
assert job['command']=='select private.cleanup_ai_match_requests();'
assert sum(r['command']==job['command'] for r in rows)==1
assert run("select count(*) from private.ai_match_cleanup_job;").stdout.strip()=='1'
assert run("select has_table_privilege('authenticated','private.ai_match_cleanup_job','SELECT');").stdout.strip()=='f'
assert run("select has_table_privilege('service_role','private.ai_match_cleanup_job','SELECT');").stdout.strip()=='f'
assert not run(migration,False).returncode==0
# Other managed tables, owners and permissions were not modified to make it pass.
assert run("select has_table_privilege('cron.job','UPDATE');").stdout.strip()=='f'
run('select private.cleanup_ai_match_requests();')
run((root/'supabase/tests/ai_match_drafts.sql').read_text())
print('PASS: postgres NOSUPERUSER/NOBYPASSRLS; cron owned by supabase_admin; SELECT-only; original LOCK denied; atomic rollback; named collision preserved; 2 concurrent migrations -> 1 success/1 abort and 1 unnamed job; concurrent unrelated writer preserved; existing jobs unchanged; registry RLS/ACL; cleanup; AI SQL official-flow test.')
