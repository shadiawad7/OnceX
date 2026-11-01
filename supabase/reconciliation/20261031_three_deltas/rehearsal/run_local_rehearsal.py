import subprocess,pathlib,json,re
root=pathlib.Path(__file__).resolve().parents[4]; out=root/'supabase/reconciliation/20261031_three_deltas/rehearsal'; pkg=out.parent
base=['docker','--host','unix:///Users/xavineta/.docker/run/docker.sock','exec','-i','oncex-rehearsal-20261031']
def sql(s):
 p=subprocess.run(base+['psql','-h','/tmp','-U','postgres','-X','-At','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True)
 if p.returncode: raise RuntimeError(p.stderr)
 return p.stdout

def snapshot(label):
 p=subprocess.run(base+['pg_dump','-h','/tmp','-U','postgres','--schema=public','--schema=private','--schema-only'],text=True,capture_output=True,check=True)
 text='\n'.join(l for l in p.stdout.splitlines() if not l.startswith(('\\restrict','\\unrestrict')))
 (out/(label+'.schema.sql')).write_text(text)
 tables=json.loads(sql("select json_agg(format('%I.%I',schemaname,tablename) order by schemaname,tablename) from pg_tables where schemaname in ('public','private','storage','auth','supabase_migrations');"))
 data={t:json.loads(sql(f"select coalesce(jsonb_agg(rowdata order by rowdata::text),'[]') from (select to_jsonb(t) rowdata from {t} t) q;")) for t in tables}
 (out/(label+'.data.json')).write_text(json.dumps(data,sort_keys=True,indent=2))
 return text,data
(out/'precheck.json').write_text(sql((pkg/'01_precheck_readonly.sql').read_text()))
pre=json.loads((out/'precheck.json').read_text()); print({k:v for k,v in pre.items() if isinstance(v,bool)},flush=True)
assert all(v for v in pre.values() if isinstance(v,bool))
a,d=snapshot('before')
(out/'patch.log').write_text(sql((pkg/'02_patch.sql').read_text()))
post=sql((pkg/'03_postcheck_readonly.sql').read_text()); (out/'postcheck.json').write_text(post)
print('POSTCHECK', {k:v for k,v in json.loads(post).items() if isinstance(v,bool)},flush=True)
b,e=snapshot('after_patch')
import difflib
(out/'patch.diff').write_text('\n'.join(difflib.unified_diff(a.splitlines(),b.splitlines(),fromfile='before',tofile='after')))
assert d==e, 'DATA CHANGED'
print('DATA UNCHANGED',flush=True)

p=subprocess.run(base+['psql','-h','/tmp','-U','postgres','-X','-At','-v','ON_ERROR_STOP=1'],input=(out/'behavior.sql').read_text(),text=True,capture_output=True)
(out/'behavior.log').write_text(p.stdout+p.stderr);print('BEHAVIOR',p.returncode,p.stderr,flush=True)
assert p.returncode==0,'Functional tests failed; container remains local for inspection'
# Verify duplicate application is rejected by the original guard.
p=subprocess.run(base+['psql','-h','/tmp','-U','postgres','-X','-At','-v','ON_ERROR_STOP=1'],input=(pkg/'02_patch.sql').read_text(),text=True,capture_output=True)
(out/'duplicate_patch.log').write_text(p.stdout+p.stderr);print('DUPLICATE PATCH EXIT',p.returncode,flush=True)
assert p.returncode!=0,'Duplicate application unexpectedly succeeded'
(out/'rollback.log').write_text(sql((pkg/'04_rollback.sql').read_text()))
(out/'rollback_precheck.json').write_text(sql((pkg/'01_precheck_readonly.sql').read_text()))
a,d=snapshot('after_rollback')
assert a==(out/'before.schema.sql').read_text(),'SCHEMA ROLLBACK MISMATCH'
assert d==json.loads((out/'before.data.json').read_text()),'DATA ROLLBACK MISMATCH'
print('ROLLBACK EXACT SCHEMA AND DATA MATCH',flush=True)
