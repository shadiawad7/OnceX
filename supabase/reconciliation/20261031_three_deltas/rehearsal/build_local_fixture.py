import subprocess,pathlib,json,re
root=pathlib.Path(__file__).resolve().parents[4]; out=root/'supabase/reconciliation/20261031_three_deltas/rehearsal'; pkg=out.parent
base=['docker','--host','unix:///Users/xavineta/.docker/run/docker.sock','exec','-i','oncex-rehearsal-20261031']
def sql(s):
 p=subprocess.run(base+['psql','-h','/tmp','-U','postgres','-X','-At','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True)
 if p.returncode: raise RuntimeError(p.stderr)
 return p.stdout
bootstrap="""create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage; create schema extensions;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage to anon,authenticated,service_role;
grant execute on function auth.uid() to public;
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
alter default privileges in schema public grant all on functions to postgres,anon,authenticated,service_role;
create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);
"""
info=json.loads(subprocess.check_output(['docker','--host','unix:///Users/xavineta/.docker/run/docker.sock','inspect','oncex-rehearsal-20261031'],text=True))[0]
assert info['HostConfig']['NetworkMode']=='none' and not info['HostConfig'].get('PortBindings'), 'Container must be isolated'
print(sql(bootstrap))
for f in sorted((root/'supabase/migrations').glob('*.sql')):
 if f.name[:12] in ['202610100004','202610120001','202610220002','202610300001']: continue
 print(f.name,flush=True); sql(f.read_text())
audit=json.load(open(__import__('sys').argv[1]))
for f in audit['functions']:
 sig=f"{f['schema']}.{f['name']}({f['identity_arguments']})"
 sql(f['definition']+';')
 if f['acl'] is not None:
  grants=[]
  for item in f['acl'].strip('{}').split(','):
   role=item.split('=')[0] or 'public'; grants.append(f'grant execute on function {sig} to {role};')
  sql(f'revoke all on function {sig} from public,anon,authenticated,service_role,postgres;'+''.join(grants))
(out/'precheck.json').write_text(sql((pkg/'01_precheck_readonly.sql').read_text()))
print('BASELINE READY')
