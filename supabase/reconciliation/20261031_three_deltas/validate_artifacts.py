"""Offline checks only. This program never connects to PostgreSQL."""
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
manifest = json.loads((HERE / 'manifest.json').read_text())
for name, fingerprint in manifest['original_migration_sha256'].items():
    assert hashlib.sha256((ROOT / 'supabase/migrations' / name).read_bytes()).hexdigest() == fingerprint, name
for name, fingerprint in manifest['artifact_sha256'].items():
    assert hashlib.sha256((HERE / name).read_bytes()).hexdigest() == fingerprint, name


def statements(sql):
    """Split outer SQL without executing or parsing function/DO bodies."""
    result, parts, i = [], [], 0
    while i < len(sql):
        if sql.startswith('--', i):
            end = sql.find('\n', i)
            i = len(sql) if end < 0 else end + 1
            parts.append(' ')
        elif sql.startswith('/*', i):
            end = sql.index('*/', i + 2)
            i = end + 2
            parts.append(' ')
        elif sql[i] in "'\"":
            quote = sql[i]
            end = i + 1
            while end < len(sql):
                if sql[end] == quote:
                    if end + 1 < len(sql) and sql[end + 1] == quote:
                        end += 2
                        continue
                    end += 1
                    break
                end += 1
            parts.append(sql[i:end])
            i = end
        elif (match := re.match(r'\$\w*\$', sql[i:])):
            tag = match[0]
            end = sql.index(tag, i + len(tag)) + len(tag)
            parts.append(sql[i:end])
            i = end
        elif sql[i] == ';':
            if ''.join(parts).strip():
                result.append(''.join(parts).strip())
            parts = []
            i += 1
        else:
            parts.append(sql[i])
            i += 1
    if ''.join(parts).strip():
        result.append(''.join(parts).strip())
    return result


def body(sql):
    match = re.search(r'\bas\s+(\$\w*\$)([\s\S]*?)\1', sql, re.I)
    assert match
    return match[2]


def functions(sql):
    result = {}
    for statement in statements(sql):
        match = re.match(r'create\s+(?:or\s+replace\s+)?function\s+([\w.]+)\s*\(', statement, re.I)
        if match:
            result[match[1]] = statement
    return result


patch = (HERE / '02_patch.sql').read_text()
rollback = (HERE / '04_rollback.sql').read_text()
fns = functions(patch)
assert set(fns) == {
    'private.can_provision', 'public.save_match_lineup',
    'public.team_jersey_numbers', 'private.require_starting_goalkeeper',
}
for name, source in fns.items():
    signature = next(s for s in manifest['after_source_md5'] if s.startswith(name + '('))
    assert hashlib.md5(body(source).encode()).hexdigest() == manifest['after_source_md5'][signature]
    migration = '202610120001_coach_account_creation.sql' if name == 'private.can_provision' else '202610220002_live_jerseys_goalkeeper.sql'
    assert body(source) == body(functions((ROOT / 'supabase/migrations' / migration).read_text())[name])

# The saved rollback functions must be the audited originals, not inferred versions.
for name, source in functions(rollback).items():
    row = next(x for x in manifest['before'] if x['signature'].startswith(name + '('))
    assert hashlib.md5((source.strip() + '\n').encode()).hexdigest() == row['definition_md5']

# Prove the two replacements contain precisely the reconciled differences.
old_functions = functions(rollback)
def normalized(sql):
    tokens = re.findall(r"--[^\n]*|/\*[\s\S]*?\*/|'(?:''|[^'])*'|[a-zA-Z_][a-zA-Z_0-9]*|[^\s]", sql)
    return [t if t.startswith("'") else t.lower() for t in tokens if not t.startswith('--') and not t.startswith('/*')]

new_lineup = body(fns['public.save_match_lineup'])
without_guard, count = re.subn(r"if not exists\(select 1 from public\.profiles where id=any\(starter_ids\) and position='Portero'\) then raise exception 'Los 11 titulares deben incluir al menos un portero\.' using errcode='22023';end if;", '', new_lineup)
assert count == 1
assert normalized(without_guard) == normalized(body(old_functions['public.save_match_lineup']))
expanded, count = re.subn(r"\(\s*tm\.role_code\s*=\s*'team_admin'\s+or\s*\(\s*kind\s*=\s*'player'\s+and\s*tm\.role_code\s*=\s*'coach'\s*\)\s*\)", "tm.role_code in ('team_admin','coach')", body(old_functions['private.can_provision']), flags=re.I)
assert count == 1
assert normalized(expanded) == normalized(body(fns['private.can_provision']))

for statement in statements(patch):
    assert re.match(r'^(begin\b|set local\b|do\s+\$|create (?:or replace )?(?:function|policy|trigger)\b|revoke\b|grant\b|commit\b)', statement, re.I), statement[:100]
assert sum(s.lower().startswith('create policy ') for s in statements(patch)) == 1
assert sum(s.lower().startswith('create trigger ') for s in statements(patch)) == 1
for name in ['01_precheck_readonly.sql', '03_postcheck_readonly.sql']:
    parts = statements((HERE / name).read_text())
    assert len(parts) == 1 and parts[0].lower().startswith('with '), name
    # Ignore string constants in catalog comparisons; no mutation/recalc is called.
    stripped = re.sub(r"'(?:''|[^'])*'|--[^\n]*|/\*[\s\S]*?\*/", ' ', parts[0])
    assert not re.search(r'\b(insert|update|delete|create|alter|drop|truncate|grant|revoke)\b', stripped, re.I), name
    assert not re.search(r'\bprivate\.(refresh\w*|close_ovr_month|apply_due_team_plans|ensure_player_identity)\s*\(', stripped, re.I), name
for statement in statements(rollback):
    assert re.match(r'^(begin\b|set local\b|do\s+\$|drop (?:function|policy|trigger)\b|create or replace function\b|commit\b)', statement, re.I), statement[:100]
    if statement.lower().startswith('drop '):
        assert not re.search(r'\bcascade\b', statement, re.I)
print('PASS: source/manifest fingerprints; four exact function bodies; exact rollback definitions; outer SQL limited to expected DDL; read-only checks; no CASCADE.')
print('NOT TESTED: PostgreSQL parsing/execution, deployment, live preconditions or rollback execution.')
