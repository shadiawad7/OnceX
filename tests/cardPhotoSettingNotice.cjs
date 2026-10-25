const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('src/lib/cardPhotos.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup(status){
 const alerts=[];const module={exports:{}};
 const deps={'react-native':{Alert:{alert:(...args)=>alerts.push(args)},Platform:{OS:'ios'}},'./client':{client:()=>({functions:{invoke:async()=>({data:{status}})}})}};
 new Function('require','module','exports',code)(name=>deps[name],module,module.exports);
 return{api:module.exports,alerts};
}
test('disabled background removal is a normal saved upload, with no failure alert',async()=>{
 const h=setup('disabled');await h.api.onPlayerPhotoSaved({playerId:'player',originalPath:'player/portrait'});assert.equal(h.alerts.length,0);
});
test('failed removal still explains that the original was saved',async()=>{
 const h=setup('failed');await h.api.onPlayerPhotoSaved({playerId:'player',originalPath:'player/portrait'});assert.equal(h.alerts.length,1);assert.match(h.alerts[0][1],/original está guardada/);
});
