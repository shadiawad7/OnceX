const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const {webcrypto}=require('node:crypto');
const code=ts.transpileModule(fs.readFileSync('supabase/functions/card-photo-cutout/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup(options={}){
 let handler,calls=0,claims=0;const objects=new Map();const source=new Blob(['original'],{type:'image/png'});let current=source;
 const bucket={download:async path=>path.endsWith('/portrait')?{data:current}:objects.has(path)?{data:objects.get(path)}:{error:true},upload:async(path,bytes)=>{if(objects.has(path))return{error:true};objects.set(path,new Blob([bytes]));if(path.endsWith('.claim'))claims++;return{};},createSignedUrl:async path=>({data:{signedUrl:'https://storage.test/'+path}})};
 const query=table=>({select(){return this;},eq(){return this;},maybeSingle:async()=>options.denied?{error:true}:{data:{photo_path:target+'/portrait'}},limit:async()=>({data:options.notPlayer?[]:[{user_id:target}]})});
 const client={auth:{getUser:async()=>({data:{user:{id:target}}})},from:query,storage:{from:()=>bucket},rpc:async()=>options.readOnly?{error:true}:{data:null}};
 const provider={backgroundRemovalProvider:()=>({removeBackground:async()=>{calls++;if(options.fail)throw Error();if(options.change)current=new Blob(['new']);return new Uint8Array([137,80,78,71,13,10,26,10]);}})};
 new Function('require','module','exports','Deno','crypto',code)(name=>name==='./provider.ts'?provider:{createClient:()=>client},{exports:{}},{},{env:{get:()=> 'configured'},serve:fn=>{handler=fn;}},webcrypto);
 return{run:async(mode='process',uploadId)=>{const response=await handler(new Request('https://edge.test',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify({target_user:target,mode,upload_id:uploadId})}));return{status:response.status,body:await response.json()};},calls:()=>calls,claims:()=>claims,objects};
}
const target='11111111-1111-1111-1111-111111111111';
test('display cache misses never process a photo',async()=>{const h=setup();assert.equal((await h.run('read')).body.status,'missing');assert.equal(h.calls(),0);assert.equal(h.claims(),0);});
test('upload processes once and subsequent reads/uploads reuse stored PNG',async()=>{const h=setup();assert.equal((await h.run()).body.status,'ready');assert.equal((await h.run('read')).body.status,'ready');await h.run();assert.equal(h.calls(),1);assert.equal(h.claims(),1);});
test('RLS denial prevents all provider calls',async()=>{const h=setup({denied:true});assert.equal((await h.run()).status,403);assert.equal(h.calls(),0);});
test('read permission cannot authorize processing',async()=>{const h=setup({readOnly:true});assert.equal((await h.run()).status,403);assert.equal(h.calls(),0);});
test('coaches/nonplayers are not sent to provider',async()=>{const h=setup({notPlayer:true});assert.equal((await h.run()).body.status,'not_player');assert.equal(h.calls(),0);});
test('provider failure preserves original and does not retry on display',async()=>{const h=setup({fail:true});assert.equal((await h.run()).body.status,'failed');await h.run('read');await h.run();assert.equal(h.calls(),1);assert.ok(![...h.objects.keys()].some(path=>path.endsWith('.png')));});
test('source changed while processing cannot attach stale cutout',async()=>{const h=setup({change:true});assert.equal((await h.run()).body.status,'superseded');assert.ok(![...h.objects.keys()].some(path=>path.endsWith('.png')));});
test('simultaneous requests share one storage claim',async()=>{const h=setup();await Promise.all([h.run(),h.run()]);assert.equal(h.calls(),1);});

test('new upload can retry failed content; reads still never retry',async()=>{const h=setup({fail:true});await h.run('process','upload-attempt-one');await h.run('read');await h.run('process','upload-attempt-two');assert.equal(h.calls(),2);});
