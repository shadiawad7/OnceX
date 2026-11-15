const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const data=JSON.parse(fs.readFileSync('src/data/matchCallupRules.json','utf8'));
const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync('src/lib/matchCallupRules.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports,()=>({__esModule:true,default:data}));
const {matchCallupRule:rule,callupLimitError,callupCompetitionKey:key}=m.exports;
const season='2026/2027';
test('territorial senior, juvenile and cadet leagues use their verified match-sheet cap',()=>{
 for(const name of ['Lliga Primera FFCV · Comunidad Valenciana','Primera FFCV','LLIGA COMUNITAT FFCV','Lliga Primera FFCV Juvenil','Liga Autonómica Cadete','Primera Cadete','Liga Preferente Infantil'])assert.equal(rule(season,name).maximum,18,name);
});
test('national divisions remain distinct from similarly named territorial leagues',()=>{
 for(const [name,maximum] of [['Primera Federación',23],['Segunda Federación',20],['Tercera Federación',20],['Lliga Tercera FFCV',18],['Liga Nacional Juvenil',18],['División de Honor Juvenil',18]])assert.equal(rule(season,name).maximum,maximum,name);
});
test('a cup does not inherit the regular league cap',()=>{
 assert.equal(rule(season,'La Nostra Copa').maximum,20);
 assert.equal(rule(season,'División de Honor Juvenil',{seasonCode:season,competitionName:'División de Honor Juvenil',groupName:'Copa de Campeones'}).maximum,22);
});
test('uses the team competition for the match season, not a cached group from another season',()=>{
 assert.equal(rule(season,'Primera FFCV',{seasonCode:'2025/2026',competitionName:'Primera Federación'}).maximum,18);
 assert.equal(rule(season,'Primera FFCV',{seasonCode:season,competitionName:'Tercera Federación'}).maximum,20);
});
test('does not invent rules for other seasons, unknown leagues or unsupported modalities',()=>{
 assert.equal(rule('2025/2026','Primera FFCV'),null);assert.equal(rule('2027/2028','Primera FFCV'),null);assert.equal(rule(null,'Primera FFCV'),null);assert.equal(rule(season,'Unknown league'),null);
 assert.equal(rule(season,'Primera FFCV',{seasonCode:season,competitionName:'Primera FFCV',modality:'FEMENÍ F11'}),null);
 assert.equal(rule(season,'Primera FFCV',{seasonCode:season,competitionName:'Primera FFCV',modality:'MASCULÍ F8'}),null);
 assert.equal(rule(season,'Primera FFCV',{seasonCode:season,competitionName:'Primera FFCV',modality:'MASCULÍ F11'}).maximum,18);
});
test('checks an existing or date-changed selection again before saving',()=>{
 const called=Array.from({length:20},(_,index)=>String(index));assert.match(callupLimitError(called,18),/Quita 2/);assert.equal(callupLimitError(called,20),'');assert.equal(callupLimitError(called,null),'');
});
test('every UI rule has one unique seasonal key and the backend uses exactly the same seed',()=>{
 const keys=new Set();for(const item of data)for(const name of item.competitions){const id=item.season+':'+key(name);assert.equal(keys.has(id),false,id);keys.add(id);assert.match(item.source,/^https:\/\/(ffcv|rfef)\.es\//);}
 const sql=fs.readFileSync('supabase/migrations/202611150001_match_callup_limits.sql','utf8');assert.deepEqual(JSON.parse(sql.split('$rules$')[1]),data);
});
