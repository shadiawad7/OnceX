// Tests the actual Edge Function with a mock Supabase SDK, without real accounts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../functions/create-account/index.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
assert.equal((compiled.diagnostics ?? []).filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
function setup(overrides = {}) {
 const calls = []; let handler;
 const sdk = {
  auth: {
   getUser: async token => { calls.push(['getUser', token]); return overrides.identity ?? { data: { user: { id: 'verified-operator' } }, error: null }; },
   admin: {
    createUser: async input => { calls.push(['createUser', input]); return overrides.created ?? { data: { user: { id: 'new-account' } }, error: null }; },
    deleteUser: async id => { calls.push(['deleteUser', id]); return overrides.cleanup ?? { error: null }; },
   },
  },
  rpc: async (name, input) => {
   calls.push([name, input]);
   if (name === 'can_create_account') return overrides.capability ?? { data: true, error: null };
   if (overrides.throwProvision) throw new Error('Simulated network outage');
   return overrides.assigned ?? { data: { club_id: 'saved-club', user_id: 'new-account', role: 'club_admin' }, error: null };
  },
 };
 const deno = { env: { get: name => overrides.missingEnv ? undefined : name === 'SUPABASE_URL' ? 'https://example.invalid' : 'server-only-key' }, serve: value => { handler = value; } };
 const createClient = (...args) => { calls.push(['client', args[2]]); return sdk; };
 new Function('require', 'exports', 'Deno', compiled.outputText)(() => ({ createClient }), {}, deno);
 const request = (body = {}, token = 'operator-token') => handler(new Request('https://example.invalid/create-account', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }));
 return { calls, request };
}
const valid = { kind: 'club', name: 'Club prueba', email: 'club@example.invalid', password: 'test-password-123', actor: 'forged-actor', role: 'super_admin' };
(async () => {
 let fixture = setup();
 assert.equal((await fixture.request(valid, null)).status, 401);
 assert.equal(fixture.calls.some(call => call[0] === 'createUser'), false);
 fixture = setup({ identity: { data: { user: null }, error: { message: 'invalid token' } } });
 assert.equal((await fixture.request(valid)).status, 401);
 assert.equal(fixture.calls.some(call => call[0] === 'createUser'), false);
 fixture = setup({ capability: { data: false, error: null } });
 assert.equal((await fixture.request(valid)).status, 403);
 assert.equal(fixture.calls.some(call => call[0] === 'createUser'), false);
 fixture = setup();
 assert.equal((await fixture.request({ ...valid, password: 'short' })).status, 400);
 assert.equal(fixture.calls.some(call => call[0] === 'createUser'), false);
 fixture = setup();
 const success = await fixture.request(valid);
 assert.equal(success.status, 201);
 const provisioning = fixture.calls.find(call => call[0] === 'provision_account')[1];
 assert.equal(provisioning.actor, 'verified-operator');
 assert.equal(provisioning.new_user, 'new-account');
 assert.equal(Object.hasOwn(provisioning, 'password'), false);
 assert.equal(Object.hasOwn(provisioning, 'role'), false);
 assert.equal(JSON.stringify(await success.json()).includes(valid.password), false);
 assert.ok(fixture.calls.findIndex(call => call[0] === 'can_create_account') < fixture.calls.findIndex(call => call[0] === 'createUser'));
 fixture = setup({ assigned: { data: null, error: { code: '42501' } } });
 assert.equal((await fixture.request(valid)).status, 403);
 assert.deepEqual(fixture.calls.find(call => call[0] === 'deleteUser'), ['deleteUser', 'new-account']);
 fixture = setup({ throwProvision: true });
 assert.equal((await fixture.request(valid)).status, 500);
 assert.ok(fixture.calls.some(call => call[0] === 'deleteUser'));
 fixture = setup({ created: { data: { user: null }, error: { code: 'email_exists' } } });
 assert.equal((await fixture.request(valid)).status, 400);
 assert.equal(fixture.calls.some(call => call[0] === 'provision_account'), false);
 fixture = setup();
 assert.equal((await fixture.request({ ...valid, kind: 'player', clubId: '10000000-0000-0000-0000-000000000001', teamId: '20000000-0000-0000-0000-000000000001' })).status, 400);
 assert.equal(fixture.calls.some(call => call[0] === 'createUser'), false);
 fixture = setup();
 assert.equal((await fixture.request(null)).status, 400);
 console.log('Create-account Edge Function checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
