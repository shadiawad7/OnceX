import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3';
import { draftIssues, parseMatchDraft, requireIdentityConfirmation, type DraftRosterPlayer } from '../_shared/matchDraft.ts';
import { openAIMatchProvider, MatchAIError } from './provider.ts';
import { matchStatisticsError } from '../../../src/lib/matchValidation.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY=11*1024*1024,MAX_AUDIO=10*1024*1024;
// Bound streamed bodies too; Content-Length alone is not trustworthy.
async function limitedBody(request:Request,max:number){
 const reader=request.body?.getReader();if(!reader)throw new Error('BODY');
 const chunks:Uint8Array[]=[];let length=0;
 for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw new Error('SIZE');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(request.method!=='POST')return reply(405,{error:'Método no permitido.'});
 let transcript:string|undefined;
 let lease:string|undefined;
 let completionClient:SupabaseClient|undefined;
 async function finish(status:number,body:Record<string,unknown>){
  if(lease&&completionClient){
   const saved=await completionClient.rpc('ai_match_request_finish',{request_lease:lease,status_code:status,result_body:body});
   if(saved.error||saved.data!==true)throw new Error('RESULT_NOT_SAVED');
   lease=undefined;
  }
  return reply(status,body);
 }
 try{
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');
  const token=request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if(!url||!anon||!token)return reply(401,{error:'Inicia sesión para preparar el partido.'});
  const caller=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const auth=await caller.auth.getUser(token);if(auth.error||!auth.data.user)return reply(401,{error:'Sesión no válida.'});
  if(Number(request.headers.get('Content-Length'))>MAX_BODY)return reply(413,{error:'El relato es demasiado largo.'});
  const contentType=request.headers.get('Content-Type')??'';
  const bytes=await limitedBody(request,contentType.startsWith('multipart/form-data')?MAX_BODY:64*1024);
  let teamId:unknown,text:unknown,audio:File|undefined;
  if(contentType.startsWith('multipart/form-data')){
   let form:FormData;try{form=await new Response(bytes,{headers:{'Content-Type':contentType}}).formData();}catch{return reply(400,{error:'El audio recibido no es válido. Puedes escribir el partido.'});}
   teamId=form.get('teamId');const file=form.get('audio');
   if(!(file instanceof File)||!file.size||file.size>MAX_AUDIO||!['audio/mp4','audio/m4a','audio/x-m4a','audio/mpeg','audio/webm','audio/wav','audio/x-wav','audio/ogg','audio/flac'].includes(file.type.split(';')[0]))return reply(400,{error:'Envía audio válido, de hasta 10 MB, o escribe el relato.'});
   audio=file;
  }else{
   if(contentType.split(';')[0].trim().toLowerCase()!=='application/json')return reply(415,{error:'Envía un relato escrito o una grabación de audio.'});
   let input;try{input=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply(400,{error:'Petición no válida.'});}
   teamId=input?.teamId;text=input?.text;
   if(typeof text!=='string'||!text.trim()||text.length>12000)return reply(400,{error:'Escribe entre 1 y 12.000 caracteres.'});
  }
  if(typeof teamId!=='string'||!uuid.test(teamId))return reply(400,{error:'Selecciona un equipo válido.'});
  if(audio){
   const header=new Uint8Array(await audio.slice(0,12).arrayBuffer()),magic=new TextDecoder().decode(header);
   const type=audio.type.split(';')[0];
   const valid=type.includes('webm')?header[0]===0x1a&&header[1]===0x45&&header[2]===0xdf&&header[3]===0xa3:type.includes('wav')?magic.startsWith('RIFF')&&magic.slice(8,12)==='WAVE':type.includes('ogg')?magic.startsWith('OggS'):type.includes('flac')?magic.startsWith('fLaC'):type.includes('mpeg')?magic.startsWith('ID3')||(header[0]===0xff&&(header[1]&0xe0)===0xe0):magic.slice(4,8)==='ftyp';
   if(!valid)return reply(400,{error:'La grabación no es un archivo de audio válido. Vuelve a dictar o escribe el relato.'});
  }
  // Hash canonical content, not multipart boundaries or a client-provided identifier.
  const referenceDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const content=audio?new Uint8Array(await audio.arrayBuffer()):new TextEncoder().encode(text as string);
  const prefix=new TextEncoder().encode(JSON.stringify(['oncex-match-v1',audio?'audio':'text',audio?.type.split(';')[0]??'']));
  const input=new Uint8Array(prefix.length+content.length);input.set(prefix);input.set(content,prefix.length);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',input))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!serviceKey)return reply(503,{error:'La IA aún no está configurada en el servidor.'});
  completionClient=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const context=await caller.rpc('ai_match_request_start',{target_team:teamId,input_hash:hash});
  if(context.error)return reply(context.error.code==='42501'?403:context.error.code==='54000'?429:503,{error:context.error.code==='42501'?'No puedes preparar partidos de este equipo.':context.error.code==='54000'?'Has alcanzado el límite de 30 peticiones de IA por hora.':'No se pudo reservar la solicitud de IA.'});
  if(context.data?.state==='completed'){
   const body=context.data.body;
   if(context.data.status===200){
    try{parseMatchDraft(body?.draft,context.data.players);}catch{return reply(409,{error:'La plantilla ha cambiado. Continúa con el registro manual.'});}
   }
   return reply(context.data.status,body);
  }
  if(context.data?.state==='processing'||context.data?.state==='expired')return reply(409,{error:'Este relato ya se envió. Si sigue en curso, espera y vuelve a consultar enviándolo igual. Si no se recupera el resultado, continúa manualmente; no se repetirá el consumo.'});
  if(context.data?.state!=='claimed'||typeof context.data.lease_id!=='string')throw new Error('INVALID_RESERVATION');
  lease=context.data.lease_id;
  const roster=context.data.players as DraftRosterPlayer[];
  if(!Array.isArray(roster)||roster.length>100)return await finish(400,{error:'No se puede procesar esta plantilla.'});
  const provider=openAIMatchProvider();
  if(audio){transcript=await provider.transcribe(audio);text=transcript;}
  const rawDraft=await provider.interpret(text as string,roster,referenceDate);
  const draft=requireIdentityConfirmation(parseMatchDraft(rawDraft,roster),roster,text as string);
  const issues=draftIssues(draft);
  // Reuse the application's existing statistical consistency check when complete.
  if(draft.duration!==null&&draft.goals_for!==null&&draft.goals_against!==null&&draft.players.every(p=>p.minutes!==null&&p.goals!==null&&p.own_goals!==null&&p.assists!==null&&p.yellow_cards!==null&&p.red_cards!==null)){
   const issue=matchStatisticsError(draft.players.map(p=>({...p,player_name:p.mentioned_name,goals:p.goals!,own_goals:p.own_goals!,assists:p.assists!,yellow_cards:p.yellow_cards!,red_cards:p.red_cards!})),draft.goals_for,draft.goals_against,draft.duration);
   if(issue)issues.warnings.push(issue);
  }
  return await finish(200,{...(transcript?{transcript}:{}),draft:{...draft,missing_fields:[...new Set([...draft.missing_fields,...issues.missing])],warnings:[...new Set([...draft.warnings,...issues.warnings]) ]}});
 }catch(error){
  const code=error instanceof MatchAIError?error.code:error instanceof Error&&error.message==='SIZE'?'SIZE':'INVALID_RESPONSE';
  const messages:Record<string,string>={CONFIG:'La IA aún no está configurada en el servidor.',TIMEOUT:'La IA ha tardado demasiado. Puedes continuar manualmente.',RATE_LIMIT:'El servicio de IA ha alcanzado su límite. Inténtalo más tarde o continúa manualmente.',EMPTY_TRANSCRIPT:'No se ha entendido la grabación. Vuelve a dictar o escribe el relato.',SIZE:'El archivo o relato es demasiado grande.',REFUSAL:'La IA no ha podido preparar el acta. Revisa el relato o continúa manualmente.'};
  const status=code==='SIZE'?413:code==='RATE_LIMIT'?429:code==='EMPTY_TRANSCRIPT'||code==='REFUSAL'?422:503;
  const body={error:messages[code]??'No se ha podido generar un borrador válido. No se ha guardado ningún dato del partido. Puedes continuar manualmente.',...(transcript?{transcript}:{})};
  try{return await finish(status,body);}catch{return reply(503,{error:'No se pudo recuperar el resultado. No se repetirá la solicitud automáticamente. Continúa manualmente.'});}
 }
});
