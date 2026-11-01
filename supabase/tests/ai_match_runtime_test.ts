// Run in Deno. Real handler + real Supabase SDK, transport mocked; never calls OpenAI.
function assert(value: unknown, message = 'Assertion failed'): void { if (!value) throw new Error(message); }
const team = '30000000-0000-0000-0000-000000000001';
const id = '10000000-0000-0000-0000-000000000001';
const roster = [{player_id:id,player_name:'Shadi González'}];
const draft = {opponent:'Valencia',played_on:null,duration:null,venue:'away',goals_for:1,goals_against:0,players:[],missing_fields:[],warnings:[]};
let handler:(request:Request)=>Promise<Response>;
let paid=0,quota=0;
let blocked:Promise<void>|undefined;
let failProvider=false;
const records=new Map<string,{state:string;lease_id:string;status?:number;body?:unknown;players:typeof roster}>();
Deno.env.set('SUPABASE_URL','https://supabase.test');
Deno.env.set('SUPABASE_ANON_KEY','local-anon');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','local-service');
Deno.env.set('OPENAI_API_KEY','local-provider');
Deno.serve=((fn:typeof handler)=>{handler=fn;return {} as ReturnType<typeof Deno.serve>;}) as typeof Deno.serve;
globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
 const request=new Request(input,init);
 const url=new URL(request.url);
 if(url.hostname==='supabase.test'){
  if(url.pathname==='/auth/v1/user')return Response.json({id:'10000000-0000-0000-0000-000000000099',aud:'authenticated',role:'authenticated'});
  const args=await request.json();
  if(url.pathname.endsWith('/ai_match_request_start')){
   const key=request.headers.get('authorization')+args.target_team+args.input_hash;
   const existing=records.get(key);
   if(existing)return Response.json(existing.state==='claimed'?{state:'processing'}:existing);
   quota++;
   const row={state:'claimed',lease_id:crypto.randomUUID(),players:roster};records.set(key,row);
   return Response.json(row);
  }
  if(url.pathname.endsWith('/ai_match_request_finish')){
   assert(request.headers.get('authorization')==='Bearer local-service','Result completion needs the backend credential');
   const row=[...records.values()].find(r=>r.lease_id===args.request_lease);
   if(!row||row.state!=='claimed')throw new Error('Invalid reservation');Object.assign(row,{state:'completed',status:args.status_code,body:args.result_body});
   return Response.json(true);
  }
 }
 if(url.hostname==='api.openai.com'){
  paid++;if(blocked)await blocked;
  if(failProvider)return Response.json({error:'fake'},{status:500});
  if(url.pathname.endsWith('/transcriptions'))return Response.json({text:'Jugamos contra Valencia fuera, ganamos uno a cero'});
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft)}]}]});
 }
 throw new Error('External requests forbidden in local test: '+url.hostname);
};
await import('../functions/ai-match-draft/index.ts');
function reset(){records.clear();paid=0;quota=0;blocked=undefined;failProvider=false;}
function text(report='Ganamos 1-0',token='coach'){
 return handler(new Request('https://local.test',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({teamId:team,text:report})}));
}
function audio(){
 const form=new FormData();form.append('teamId',team);form.append('audio',new Blob([new Uint8Array([0,0,0,20]),'ftypM4A test'],{type:'audio/mp4'}),'match.m4a');
 return handler(new Request('https://local.test',{method:'POST',headers:{Authorization:'Bearer coach'},body:form}));
}
Deno.test('real Deno handler + SDK: 20 concurrent requests and completed replay',async()=>{
 reset();let release!:()=>void;blocked=new Promise<void>(resolve=>{release=resolve;});
 const first=text();while(paid===0)await new Promise(resolve=>setTimeout(resolve,1));
 const duplicates=await Promise.all(Array.from({length:20},()=>text()));
 assert(duplicates.every(r=>r.status===409));assert(paid===1&&quota===1);
 release();const a=await first;assert(a.status===200);
 const b=await text();assert(b.status===200);assert(JSON.stringify(await a.json())===JSON.stringify(await b.json()));
 assert(paid===1&&quota===1);
});
Deno.test('real Deno handler: identical audio replays transcription and draft',async()=>{
 reset();const a=await audio(),b=await audio();assert(a.status===200&&b.status===200);
 assert(JSON.stringify(await a.json())===JSON.stringify(await b.json()));assert(paid===2&&quota===1);
});
Deno.test('real Deno handler: cached failure and user/content isolation',async()=>{
 reset();failProvider=true;assert((await text()).status===503);assert((await text()).status===503);assert(paid===1&&quota===1);
 failProvider=false;assert((await text('Ganamos 2-0')).status===200);assert((await text('Ganamos 1-0','other-coach')).status===200);assert(paid===3&&quota===3);
});
