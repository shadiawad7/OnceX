const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(path,requireModule=()=>{throw new Error('Unexpected import');}){const module={exports:{}};new Function('module','exports','require',compile(path))(module,module.exports,requireModule);return module.exports;}
const shared=load('supabase/functions/_shared/matchDraft.ts');
const validation=load('src/lib/matchValidation.ts');
const teamId='30000000-0000-0000-0000-000000000001';
const roster=[{player_id:'10000000-0000-0000-0000-000000000001',player_name:'Shadi González'},{player_id:'10000000-0000-0000-0000-000000000002',player_name:'Pablo Pérez'},{player_id:'10000000-0000-0000-0000-000000000003',player_name:'Pablo López'}];
const player=(overrides={})=>({mentioned_name:'Shadi',player_id:roster[0].player_id,candidate_ids:[],identity_status:'matched',confidence:'high',starter:null,minutes:90,goals:1,own_goals:null,assists:null,yellow_cards:null,red_cards:null,conceded_while_playing:null,...overrides});
const draft=(overrides={})=>({opponent:'Valencia',played_on:null,duration:null,venue:'away',goals_for:3,goals_against:1,players:[player()],missing_fields:[],warnings:[],...overrides});
test('unknowns remain null, and source is not mutated',()=>{
 const input=draft(),result=shared.parseMatchDraft(input,roster);result.players[0].goals=2;
 assert.equal(input.players[0].goals,1);assert.equal(result.duration,null);assert.equal(result.players[0].own_goals,null);
 assert.ok(shared.draftIssues(result).missing.includes('played_on'));
});
test('strict schema rejects extra scores, foreign players/candidates, invalid dates and nonintegers',()=>{
 for(const input of [draft({oncex_points:99}),draft({played_on:'2026-02-30'}),draft({players:[player({player_id:'foreign'})]}),draft({players:[player({candidate_ids:['foreign']})]}),draft({players:[player({minutes:2.5})]}),draft({players:[player({goals:-1})]})])assert.throws(()=>shared.parseMatchDraft(input,roster));
});
test('unique exact first name may match; ambiguous first name must be selected',()=>{
 assert.equal(shared.requireIdentityConfirmation(draft(),roster,'Shadi marcó un gol').players[0].player_id,roster[0].player_id);
 const result=shared.requireIdentityConfirmation(draft({players:[player({mentioned_name:'Pablo',player_id:roster[1].player_id})]}),roster,'Pablo jugó');
 assert.equal(result.players[0].identity_status,'needs_confirmation');assert.equal(result.players[0].player_id,null);assert.equal(result.players[0].candidate_ids.length,2);
});
test('fuzzy, uncertain and invented mentions cannot silently select a player',()=>{
 for(const input of [player({mentioned_name:'Chadi'}),player({confidence:'medium'}),player({identity_status:'needs_confirmation'})])assert.equal(shared.requireIdentityConfirmation(draft({players:[input]}),roster,'Shadi jugó').players[0].player_id,null);
 assert.equal(shared.requireIdentityConfirmation(draft(),roster,'Ethan jugó').players[0].player_id,null);
});
test('duplicates, impossible minutes, unplayed actions and inconsistent result are surfaced',()=>{
 const result=shared.draftIssues(draft({duration:90,goals_for:0,players:[player({minutes:91}),player({minutes:0})]}));
 assert.match(result.warnings.join(' '),/dos veces/);assert.match(result.warnings.join(' '),/duración/);assert.match(result.warnings.join(' '),/0 minutos/);assert.match(result.warnings.join(' '),/marcador/);
});

function handler({authenticated=true,authorized=true,limit=false,provider,secret='test-server-secret',model}={}){
 let serve;const calls={provider:0,context:0,writes:0};
 const caller={auth:{getUser:async()=>({data:{user:authenticated?{id:'coach'}:null},error:null})},rpc:async(name,args)=>{
  assert.equal(name,'ai_match_context');assert.equal(args.target_team,teamId);calls.context++;
  return authorized&&!limit?{data:{players:roster},error:null}:{data:null,error:{code:limit?'54000':'42501'}};
 },from:()=>{calls.writes++;assert.fail('AI must never write official tables');}};
 const deno={serve:fn=>{serve=fn;},env:{get:name=>({SUPABASE_URL:'https://supabase.test',SUPABASE_ANON_KEY:'anon',OPENAI_API_KEY:secret,OPENAI_MATCH_MODEL:model}[name])}};
 const req=name=>name.startsWith('npm:')?{createClient:()=>caller}:name.includes('_shared')?shared:name==='./provider.ts'?providerModule.exports:validation;
 const fetcher=async(url,options)=>{calls.provider++;assert.equal(options.headers.Authorization,'Bearer test-server-secret');return provider?provider(url,options):new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft())}]}]}),{headers:{'Content-Type':'application/json'}});};
 const providerModule={exports:{}};new Function('module','exports','require','Deno','fetch',compile('supabase/functions/ai-match-draft/provider.ts'))(providerModule,providerModule.exports,req,deno,fetcher);
 const module={exports:{}};new Function('module','exports','require','Deno','fetch',compile('supabase/functions/ai-match-draft/index.ts'))(module,module.exports,req,deno,fetcher);
 const request=(body={teamId,text:'Shadi marcó un gol'},headers={})=>serve(new Request('https://supabase.test/ai-match-draft',{method:'POST',headers:{Authorization:'Bearer coach-token','Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)}));
 return {request,serve,calls};
}
test('unauthenticated and unauthorized requests never reach OpenAI',async()=>{
 for(const options of [{authenticated:false},{authorized:false}]){
  const h=handler(options),response=await h.request();assert.equal(response.status,options.authenticated===false?401:403);assert.equal(h.calls.provider,0);assert.equal(h.calls.writes,0);
 }
});
test('budget, invalid body and missing server secret fail without provider calls',async()=>{
 for(const [options,body,status] of [[{limit:true},undefined,429],[{secret:''},undefined,503],[{},'{',400],[{},{teamId:'bad',text:'Partido'},400],[{},{teamId,text:''},400]]){
  const h=handler(options),response=await h.request(body);assert.equal(response.status,status);assert.equal(h.calls.provider,0);
 }
});
test('valid request returns a validated draft, uses server roster, and never writes official data',async()=>{
 const h=handler({provider:async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body),context=JSON.parse(body.input);
  assert.equal(body.model,'gpt-5-mini');assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.deepEqual(context.roster,roster);assert.equal(context.roster[0].email,undefined);
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft())}]}]});
 }});
 const response=await h.request({teamId,text:'Shadi marcó un gol',roster:[{player_id:'evil'}],model:'untrusted-client-model'});assert.equal(response.status,200);
 const body=await response.json();assert.equal(body.draft.players[0].player_id,roster[0].player_id);assert.equal(body.draft.players[0].minutes,90);assert.ok(body.draft.missing_fields.includes('lineup.eleven_starters'));assert.equal(body.draft.oncex_points,undefined);assert.equal(h.calls.writes,0);
});
test('several players, home/away result and every supported action survive interpretation and validation',async()=>{
 const report='Jugamos en casa contra Valencia el 29 de octubre de 2026, 90 minutos. Ganamos 3-1. Shadi jugó 90, marcó un gol y dio una asistencia. Pablo Pérez jugó 70, marcó dos, recibió amarilla y roja y marcó en propia.';
 const expected=draft({played_on:'2026-10-29',duration:90,venue:'home',players:[
  player({assists:1,own_goals:0,yellow_cards:0,red_cards:0,conceded_while_playing:1}),
  player({mentioned_name:'Pablo Pérez',player_id:roster[1].player_id,minutes:70,goals:2,own_goals:1,assists:0,yellow_cards:1,red_cards:1}),
 ]});
 const h=handler({provider:async(url,options)=>{
  assert.equal(JSON.parse(JSON.parse(options.body).input).report,report);
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(expected)}]}]});
 }});
 const response=await h.request({teamId,text:report});assert.equal(response.status,200);
 const actual=(await response.json()).draft;
 for(const key of ['opponent','played_on','duration','venue','goals_for','goals_against'])assert.equal(actual[key],expected[key]);
 assert.deepEqual(actual.players,expected.players);assert.equal(h.calls.provider,1);assert.equal(h.calls.writes,0);
});
test('a named player outside the roster stays unresolved without creating an account',async()=>{
 const h=handler({provider:async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft({players:[player({mentioned_name:'Desconocido',player_id:null,candidate_ids:[],identity_status:'needs_confirmation',confidence:'low'})]}))}]}]})});
 const response=await h.request({teamId,text:'Desconocido marcó un gol'}),body=await response.json();
 assert.equal(body.draft.players[0].player_id,null);assert.equal(body.draft.players[0].identity_status,'needs_confirmation');assert.equal(h.calls.writes,0);
});
test('invalid, refused, truncated or failed model response returns no draft and no secret',async()=>{
 for(const payload of [draft({players:[player({player_id:'foreign'})]}),'invalid','refused','incomplete','failed']){
  const h=handler({provider:async()=>payload==='failed'?new Response('private provider error',{status:500}):Response.json({status:payload==='incomplete'?'incomplete':'completed',output:[{type:'message',content:[payload==='refused'?{type:'refusal'}:{type:'output_text',text:payload==='invalid'?'bad json':JSON.stringify(payload)}]}]})});
  const response=await h.request(),body=await response.json();assert.ok(response.status>=400);assert.equal(body.draft,undefined);assert.ok(!JSON.stringify(body).includes('test-server-secret'));assert.equal(h.calls.writes,0);
 }
});
const audioRequest=(h,blob=new Blob([new Uint8Array([0,0,0,20,102,116,121,112,77,52,65,32])],{type:'audio/mp4'}))=>{
 const body=new FormData();body.append('teamId',teamId);body.append('audio',blob,'voice.m4a');
 return h.serve(new Request('https://supabase.test/ai-match-draft',{method:'POST',headers:{Authorization:'Bearer coach-token'},body}));
};
test('one recording transcribes once and interprets once; both draft and transcript are reviewable',async()=>{
 const transcript='Shadi jugó 90 minutos y marcó un gol';
 const h=handler({provider:async(url,options)=>{
  if(url.endsWith('transcriptions')){assert.equal(options.body.get('model'),'gpt-transcribe');return Response.json({text:transcript});}
  assert.equal(JSON.parse(JSON.parse(options.body).input).report,transcript);
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft())}]}]});
 }});
 const response=await audioRequest(h);assert.equal(response.status,200);const body=await response.json();
 assert.equal(body.transcript,transcript);assert.equal(body.draft.players[0].minutes,90);assert.equal(h.calls.provider,2);assert.equal(h.calls.writes,0);
});
test('empty, wrongly typed and corrupt audio never reach the provider',async()=>{
 for(const blob of [new Blob([],{type:'audio/mp4'}),new Blob(['wrong'],{type:'image/png'}),new Blob(['wrong'],{type:'audio/mp4'})]){
  const h=handler(),response=await audioRequest(h,blob);assert.equal(response.status,400);assert.equal(h.calls.provider,0);
 }
});
test('empty transcription prevents interpretation',async()=>{
 const h=handler({provider:async()=>Response.json({text:' '})});const response=await audioRequest(h);
 assert.equal(response.status,422);assert.equal(h.calls.provider,1);assert.equal(h.calls.writes,0);
});
test('failed interpretation preserves transcript so the coach can continue manually',async()=>{
 const transcript='Shadi jugó';const h=handler({provider:async(url)=>url.endsWith('transcriptions')?Response.json({text:transcript}):new Response('failure',{status:500})});
 const response=await audioRequest(h);assert.equal(response.status,503);assert.equal((await response.json()).transcript,transcript);assert.equal(h.calls.writes,0);
});
test('timeout and OpenAI rate limit produce recoverable messages without official writes',async()=>{
 for(const timeout of [true,false]){
  const h=handler({provider:async()=>{if(timeout)throw new DOMException('timeout','TimeoutError');return new Response('limit',{status:429});}});
  const response=await h.request();assert.equal(response.status,timeout?503:429);assert.match((await response.json()).error,/manualmente/);assert.equal(h.calls.writes,0);
 }
});
test('model is configurable only from server environment',async()=>{
 const h=handler({model:'server-selected-model',provider:async(url,options)=>{
  assert.equal(JSON.parse(options.body).model,'server-selected-model');return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft())}]}]});
 }});
 assert.equal((await h.request({teamId,text:'Shadi marcó un gol',model:'client-model'})).status,200);
});
const review=load('src/lib/matchDraftReview.ts',()=>shared);
const completePlayer=(overrides={})=>player({own_goals:0,assists:0,yellow_cards:0,red_cards:0,...overrides});
const slot={slot_id:'server-slot',player_id:roster[0].player_id,player_name:'Shadi González',player_position:'Delantero',starter:true,minutes:null,goals:0,own_goals:0,assists:0,yellow_cards:0,red_cards:0,conceded_while_playing:null,clean_sheet:null};
test('review blocks unresolved identities, duplicate players and unreported actions',()=>{
 assert.match(review.draftReviewError(draft()),/pendientes/);
 assert.match(review.draftReviewError(draft({players:[completePlayer({player_id:null,identity_status:'needs_confirmation'})]})),/jugadores/);
 assert.match(review.draftReviewError(draft({players:[completePlayer(),completePlayer()]})),/repetido/);
});
test('reviewed statistics bind to server slots without inventing minutes or changing starter identity',()=>{
 const result=review.applyDraftAppearances([slot],draft({players:[completePlayer({minutes:null,starter:false})]}))[0];
 assert.equal(result.slot_id,'server-slot');assert.equal(result.player_id,slot.player_id);assert.equal(result.starter,true);assert.equal(result.minutes,null);assert.equal(result.goals,1);assert.equal(result.clean_sheet,null);assert.equal(result.oncex_points,undefined);
 assert.throws(()=>review.applyDraftAppearances([],draft({players:[completePlayer()]})),/fuera/);
});
test('manual registration is unchanged when no AI draft is applied',()=>{
 const slots=[slot];assert.strictEqual(review.applyDraftAppearances(slots,null),slots);
});

function mobile(invoke){
 return load('src/lib/aiMatchDraft.ts',name=>name==='react-native'?{Platform:{OS:'ios'}}:name==='./client'?{client:()=>({auth:{getSession:async()=>({data:{session:{access_token:'user-jwt'}},error:null})},functions:{invoke}})}:shared);
}
test('mobile sends only text and team ID to authenticated backend, never a provider model/key',async()=>{
 const api=mobile(async(name,options)=>{
  assert.equal(name,'ai-match-draft');assert.deepEqual(options.body,{teamId,text:'Shadi marcó un gol'});assert.equal(options.headers.Authorization,'Bearer user-jwt');
  return {data:{draft:draft()},error:null};
 });
 const result=await api.interpretMatch(teamId,'Shadi marcó un gol',roster.map(p=>({id:p.player_id,name:p.player_name})));assert.equal(result.players[0].goals,1);
});
test('mobile network failures and partial voice failures remain recoverable',async()=>{
 const network=mobile(async()=>({data:null,error:{context:new Error('network')}}));
 await assert.rejects(()=>network.interpretMatch(teamId,'partido',[]),/conectar/);
 const partial=mobile(async()=>({data:null,error:{},response:Response.json({error:'Continúa manualmente',transcript:'Shadi jugó'},{status:503})}));
 try{await partial.interpretMatch(teamId,'partido',[]);assert.fail('Expected error');}catch(error){assert.equal(error.transcript,'Shadi jugó');assert.match(error.message,/manualmente/);}
});
