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

function handler({authenticated=true,authorized=true,limit=false,provider,secret='test-server-secret',model,store=new Map(),finishFailure=false}={}){
 let serve;const calls={provider:0,context:0,writes:0};
 const caller={auth:{getUser:async()=>({data:{user:authenticated?{id:'coach'}:null},error:null})},rpc:async(name,args)=>{
  if(name==='ai_match_request_finish'){
   if(finishFailure)return {data:null,error:{code:'UNAVAILABLE'}};
   const row=[...store.values()].find(r=>r.lease_id===args.request_lease);
   if(!row||row.state!=='claimed')return {data:false,error:null};
   Object.assign(row,{state:'completed',status:args.status_code,body:args.result_body});return {data:true,error:null};
  }
  assert.equal(name,'ai_match_request_start');assert.equal(args.target_team,teamId);
  if(!authorized)return {data:null,error:{code:'42501'}};
  const old=store.get(args.input_hash);
  if(old)return {data:old.state==='claimed'?{state:'processing'}:{...old,players:roster},error:null};
  if(limit)return {data:null,error:{code:'54000'}};
  calls.context++;const claim={state:'claimed',lease_id:crypto.randomUUID(),players:roster};store.set(args.input_hash,claim);
  return {data:{...claim},error:null};
 },from:()=>{calls.writes++;assert.fail('AI must never write official tables');}};
 const deno={serve:fn=>{serve=fn;},env:{get:name=>({SUPABASE_URL:'https://supabase.test',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'local-service-key',OPENAI_API_KEY:secret,OPENAI_MATCH_MODEL:model}[name])}};
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

function mobile(invoke,RecordingFile=class extends Blob {constructor(){super([new Uint8Array([0,0,0,20]),'ftypM4A test'],{type:'audio/mp4'});this.exists=true;this.name='match.m4a';}async bytes(){return new Uint8Array(await this.arrayBuffer());}}){
 return load('src/lib/aiMatchDraft.ts',name=>name==='react-native'?{Platform:{OS:'ios'}}:name==='expo-file-system'?{File:RecordingFile}:name==='./client'?{client:()=>({auth:{getSession:async()=>({data:{session:{access_token:'user-jwt'}},error:null})},functions:{invoke}})}:shared);
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

test('duplicate completed text replays the same result without provider calls or quota',async()=>{
 const h=handler();const first=await h.request();const result=await first.json();
 const second=await h.request();assert.equal(second.status,200);assert.deepEqual(await second.json(),result);
 assert.equal(h.calls.provider,1);assert.equal(h.calls.context,1);
});
test('concurrent requests across separate handler instances reserve one processing attempt',async()=>{
 const store=new Map();let release;const gate=new Promise(resolve=>{release=resolve;});
 const first=handler({store,provider:async()=>{await gate;return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft())}]}]});}});
 const other=handler({store});const pending=first.request();
 while(first.calls.provider===0)await new Promise(resolve=>setTimeout(resolve,1));
 const duplicates=await Promise.all(Array.from({length:10},()=>other.request()));
 assert.ok(duplicates.every(r=>r.status===409));assert.equal(other.calls.provider,0);assert.equal(other.calls.context,0);
 release();assert.equal((await pending).status,200);assert.equal((await other.request()).status,200);assert.equal(other.calls.provider,0);
});
test('multipart boundaries do not change the audio identity; cached transcript/draft are reused',async()=>{
 const h=handler({provider:async url=>url.endsWith('transcriptions')?Response.json({text:'Shadi marcó un gol'}):Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft())}]}]})});
 const blob=new Blob([new Uint8Array([0,0,0,20]),'ftypM4A test'],{type:'audio/mp4'});
 const a=await audioRequest(h,blob),b=await audioRequest(h,blob);assert.equal(a.status,200);assert.equal(b.status,200);
 assert.deepEqual(await a.json(),await b.json());assert.equal(h.calls.provider,2);assert.equal(h.calls.context,1);
});
test('provider failure is cached; repeated failures never repeat paid processing',async()=>{
 const h=handler({provider:async()=>{throw new Error('network');}});
 assert.equal((await h.request()).status,503);assert.equal((await h.request()).status,503);assert.equal(h.calls.provider,1);
});
test('lost completion write leaves a reservation and never takes over processing',async()=>{
 const h=handler({finishFailure:true});assert.equal((await h.request()).status,503);
 assert.equal((await h.request()).status,409);assert.equal(h.calls.provider,1);
});
test('different reports are different explicit operations',async()=>{
 const h=handler();await h.request();await h.request({teamId,text:'Shadi jugó 70 minutos'});assert.equal(h.calls.provider,2);
});
test('AI after lineup keeps saved details and starter identity authoritative',()=>{
 const input=draft({opponent:'Otro rival',played_on:null,duration:120,venue:'away',players:[completePlayer({starter:false})]});
 const details={opponent:'Rival guardado',played_on:'2026-11-01',duration:90,venue:'home'};
 const bound=review.bindDraftToSavedLineup(input,details,[slot]);
 for(const key of Object.keys(details))assert.equal(bound[key],details[key]);
 assert.equal(bound.players[0].starter,true);assert.equal(bound.players[0].goals,1);
 assert.match(bound.warnings.join(' '),/datos guardados/);
 assert.equal(input.duration,120);assert.equal(input.players[0].starter,false);
 const applied=review.applyDraftAppearances([slot],bound);
 assert.equal(applied[0].slot_id,slot.slot_id);assert.equal(applied[0].starter,true);
});
test('AI after lineup never adds a player outside the saved match slots',()=>{
 const outside=completePlayer({player_id:roster[1].player_id});
 const bound=review.bindDraftToSavedLineup(draft({players:[outside]}),{opponent:'Valencia',played_on:'2026-11-01',duration:90,venue:'home'},[slot]);
 assert.equal(bound.players[0].starter,null);
 assert.throws(()=>review.applyDraftAppearances([slot],bound),/fuera de la alineación/);
});

test('mobile distinguishes gateway boot errors from connection failures without exposing raw gateway content',async()=>{
 const api=mobile(async()=>({data:null,error:{},response:Response.json({code:'BOOT_ERROR',message:'sensitive internal details'},{status:503,headers:{'sb-request-id':'abc-123'}})}));
 await assert.rejects(()=>api.interpretMatch(teamId,'relato',[]),error=>/HTTP 503.*BOOT_ERROR/.test(error.message)&&error.message.includes('abc-123')&&!error.message.includes('sensitive'));
});
test('mobile reports non-JSON gateway timeouts and upload limits instead of blaming connectivity',async()=>{
 for(const status of [413,504]){
  const api=mobile(async()=>({data:null,error:{},response:new Response('gateway html',{status})}));
  await assert.rejects(()=>api.interpretMatch(teamId,'relato',[]),error=>error.message.includes(`HTTP ${status}`)&&!error.message.includes('Comprueba la conexión'));
 }
});

test('AI summary groups complementary facts into one player without inventing or summing totals',()=>{
 const inputs=[player({minutes:90,goals:1,assists:null}),player({minutes:null,goals:null,assists:1}),player({minutes:null,goals:1,yellow_cards:1})];
 const groups=review.groupDraftPlayers(inputs);
 assert.equal(groups.length,1);assert.deepEqual(groups[0].indices,[0,1,2]);
 assert.equal(groups[0].player.goals,1);assert.equal(groups[0].player.assists,1);assert.equal(groups[0].player.yellow_cards,1);assert.equal(groups[0].player.minutes,90);
 assert.equal(groups[0].player.red_cards,null);assert.deepEqual(groups[0].conflicts,{});assert.equal(inputs[0].assists,null);
});
test('AI summary preserves contradictory totals for explicit review instead of picking or adding',()=>{
 const group=review.groupDraftPlayers([player({minutes:90,goals:1}),player({minutes:70,goals:2})])[0];
 assert.equal(group.player.minutes,null);assert.equal(group.player.goals,null);
 assert.deepEqual(group.conflicts.minutes,[90,70]);assert.deepEqual(group.conflicts.goals,[1,2]);
});
test('AI summary never merges unresolved names or different player identities',()=>{
 const pending=player({mentioned_name:'Pablo',player_id:null,identity_status:'needs_confirmation'});
 assert.equal(review.groupDraftPlayers([pending,{...pending}]).length,2);
 assert.equal(review.groupDraftPlayers([player(),player({player_id:roster[1].player_id})]).length,2);
});

test('coach review defaults every unreported statistic to zero without hiding contradictions or choosing identities',()=>{
 const input=[player({minutes:null,goals:null}),player({minutes:null,goals:null})];
 const groups=review.groupDraftPlayers(input,true);
 assert.equal(groups.length,1);
 for(const field of shared.performanceFields)assert.equal(groups[0].player[field],0);
 assert.equal(input[0].minutes,null);
 const conflict=review.groupDraftPlayers([player({goals:1}),player({goals:2})],true)[0];
 assert.equal(conflict.player.goals,null);assert.deepEqual(conflict.conflicts.goals,[1,2]);
 const unknown=review.groupDraftPlayers([player({player_id:null,identity_status:'needs_confirmation'})],true)[0];
 assert.equal(unknown.player.player_id,null);assert.equal(unknown.player.identity_status,'needs_confirmation');
});
test('AI review includes the entire saved lineup: quiet starters get 90 minutes and zero actions',()=>{
 const slots=Array.from({length:11},(_,i)=>({...slot,slot_id:`slot-${i}`,player_id:`player-${i}`,player_name:`Player ${i}`,minutes:null}));
 const input=draft({players:[completePlayer({player_id:'player-0',minutes:null,goals:1})]});
 const bound=review.bindDraftToSavedLineup(input,{opponent:'Valencia',played_on:'2026-11-01',duration:90,venue:'home'},slots);
 const groups=review.groupDraftPlayers(bound.players,true,{lineup:slots,duration:90});
 assert.equal(groups.length,11);
 assert.ok(groups.every(g=>g.player.minutes===90));
 for(const g of groups.slice(1))for(const field of shared.actionFields)assert.equal(g.player[field],0);
 const applied=review.applyDraftAppearances(slots,{...bound,players:groups.map(g=>g.player)});
 assert.ok(applied.every(p=>p.minutes===90));assert.equal(applied[0].goals,1);assert.equal(applied[10].goals,0);
});
test('AI review preserves explicit substitution minutes and distinguishes unused from mentioned substitutes',()=>{
 const slots=[slot,{...slot,slot_id:'bench',player_id:roster[1].player_id,starter:false}];
 const details={opponent:'Valencia',played_on:'2026-11-01',duration:90,venue:'home'};
 let bound=review.bindDraftToSavedLineup(draft({players:[completePlayer({minutes:60})]}),details,slots);
 let groups=review.groupDraftPlayers(bound.players,true,{lineup:slots,duration:90});
 assert.equal(groups[0].player.minutes,60);assert.equal(groups[1].player.minutes,0);
 bound=review.bindDraftToSavedLineup(draft({players:[completePlayer({minutes:60}),completePlayer({player_id:roster[1].player_id,minutes:30})]}),details,slots);
 groups=review.groupDraftPlayers(bound.players,true,{lineup:slots,duration:90});assert.deepEqual(groups.map(g=>g.player.minutes),[60,30]);
 bound=review.bindDraftToSavedLineup(draft({players:[completePlayer({player_id:roster[1].player_id,minutes:null})]}),details,slots);
 groups=review.groupDraftPlayers(bound.players,true,{lineup:slots,duration:90});assert.equal(groups[0].player.minutes,null);
});

test('iPhone upload sends actual file bytes compatible with the installed Expo multipart encoder',async()=>{
 const encoder=load('node_modules/expo/src/winter/fetch/convertFormData.ts',()=>({blobToArrayBufferAsync:blob=>blob.arrayBuffer()}));
 const legacy={entries:()=>[['teamId',teamId],['audio',{uri:'file:///cache/voice.m4a',name:'match.m4a',type:'audio/mp4'}]]};
 await assert.rejects(()=>encoder.convertFormDataAsync(legacy),/Unsupported FormDataPart/);
 let calls=0;
 const api=mobile(async(_name,options)=>{
  calls++;assert.equal(options.headers['Content-Type'],undefined);
  const {body,boundary}=await encoder.convertFormDataAsync(options.body);
  const parts=await new Response(body,{headers:{'Content-Type':`multipart/form-data; boundary=${boundary}`}}).formData();
  assert.equal(parts.get('teamId'),teamId);const file=parts.get('audio');assert.ok(file instanceof Blob);assert.equal(file.type,'audio/mp4');assert.equal(file.name,'match.m4a');
  const bytes=new Uint8Array(await file.arrayBuffer());assert.equal(new TextDecoder().decode(bytes.slice(4,8)),'ftyp');
  return {data:{transcript:'Shadi marcó un gol',draft:draft()},error:null};
 });
 const result=await api.interpretMatchRecording(teamId,'file:///cache/voice.m4a',roster.map(p=>({id:p.player_id,name:p.player_name})));
 assert.equal(result.transcript,'Shadi marcó un gol');assert.equal(calls,1);
});
test('missing, empty or oversized native recordings fail locally without an HTTP request',async()=>{
 for(const info of [{exists:false,size:0},{exists:true,size:0},{exists:true,size:11*1024*1024}]){
  class RecordingFile{constructor(){Object.assign(this,info);}}
  const api=mobile(async()=>{assert.fail('No upload expected');},RecordingFile);
  await assert.rejects(()=>api.interpretMatchRecording(teamId,'file:///cache/voice.m4a',[]),/grabación/);
 }
});
test('installed Expo FormData encodes structural Expo File objects through their bytes method',async()=>{
 const encoder=load('node_modules/expo/src/winter/fetch/convertFormData.ts',()=>({blobToArrayBufferAsync:blob=>blob.arrayBuffer()}));
 const {installFormDataPatch}=load('node_modules/expo/src/winter/FormData.ts');
 class NativeFormData{constructor(){this._parts=[];}}
 installFormDataPatch(NativeFormData);
 const form=new NativeFormData();let reads=0;
 form.append('teamId',teamId);form.append('audio',{name:'recording.m4a',type:'audio/mp4',bytes:async()=>{reads++;return new Uint8Array([0,0,0,20,102,116,121,112]);}},'match.m4a');
 const {body,boundary}=await encoder.convertFormDataAsync(form);
 const decoded=await new Response(body,{headers:{'Content-Type':`multipart/form-data; boundary=${boundary}`}}).formData();
 assert.equal(reads,1);assert.equal(decoded.get('audio').size,8);assert.equal(decoded.get('audio').type,'audio/mp4');assert.equal(decoded.get('teamId'),teamId);
});
