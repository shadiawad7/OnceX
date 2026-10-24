const {test}=require('node:test'),assert=require('node:assert/strict'),ts=require('typescript'),fs=require('fs'),Module=require('module');
const m=new Module('steps',module);m._compile(ts.transpileModule(fs.readFileSync('src/lib/matchEntrySteps.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'steps');const {matchEntryStepError:check}=m.exports;
test('step one is required before every later input',()=>{for(const step of ['details','result','statistics'])assert.match(check(null,'2','1',step),/paso 1/);});
test('venue unlocks details and result without requiring a result yet',()=>{for(const venue of ['home','away'])for(const step of ['details','result'])assert.equal(check(venue,'','',step),'');});
test('both goals must be filled before player statistics',()=>{for(const [a,b] of [['',''],['1',''],['','0'],['100','0'],['2','x']])assert.match(check('home',a,b,'statistics'),/paso 2/);});
test('explicit 0-0 is a complete valid result',()=>assert.equal(check('away','0','0','statistics'),''));
test('home and away allow statistics after score is complete',()=>{for(const venue of ['home','away'])assert.equal(check(venue,'2','1','statistics'),'');});
