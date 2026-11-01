import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { client } from './client';
import type { HierarchyItem } from './hierarchy';
import { parseMatchDraft, type MatchDraft } from '../../supabase/functions/_shared/matchDraft';
export { actionFields, draftIssues, performanceFields } from '../../supabase/functions/_shared/matchDraft';
export type { MatchDraft, DraftPlayer } from '../../supabase/functions/_shared/matchDraft';

export class MatchDraftRequestError extends Error {
 constructor(message:string,public transcript?:string){super(message);}
}
async function request(body:Record<string,unknown>|FormData){
 const {data:auth,error:sessionError}=await client().auth.getSession();
 if(sessionError||!auth.session)throw new Error('Vuelve a iniciar sesión.');
 const {data,error,response}=await client().functions.invoke('ai-match-draft',{body,headers:{Authorization:`Bearer ${auth.session.access_token}`},timeout:125000});
 if(error){
  const context=(response??(error as {context?:Response}).context);
  const failure=(context&&typeof context.json==='function'?await context.json().catch(()=>null):null) as {error?:unknown;transcript?:unknown}|null;
  const gateway=failure as {code?:unknown}|null;
  const status=context?.status;
  const cause=(error as {context?:{name?:string}}).context?.name;
  const messages:Record<number,string>={
   401:'La sesión ha caducado o Supabase ha rechazado el token. Vuelve a iniciar sesión.',
   403:'No tienes permiso para preparar este partido.',
   404:'El asistente de partidos no está disponible en el proyecto Supabase de esta app.',
   409:'Este relato ya está en proceso. Espera antes de volver a enviarlo.',
   413:'La grabación supera el tamaño permitido.',
   429:'Se ha alcanzado el límite de solicitudes de IA.',
   502:'Supabase no ha podido obtener una respuesta del asistente.',
   503:'El asistente no ha podido arrancar o terminar en Supabase. Revisa los registros de la función.',
   504:'Supabase ha agotado el tiempo de espera del asistente. El procesamiento podría seguir en curso.',
  };
  const base=typeof failure?.error==='string'?failure.error:
   typeof status==='number'?(messages[status]??'El servidor ha rechazado la solicitud del asistente.'):
   cause==='AbortError'||cause==='TimeoutError'?'Se agotó el tiempo de envío al asistente. El servidor podría seguir procesando la solicitud.':
   'No se puede conectar con el asistente: no se recibió respuesta del servidor. Comprueba la conexión o continúa manualmente.';
  const code=typeof gateway?.code==='string'&&/^[A-Z][A-Z0-9_]{1,60}$/.test(gateway.code)?gateway.code:undefined;
  const requestId=context?.headers?.get?.('sb-request-id')??context?.headers?.get?.('x-request-id');
  const reference=typeof requestId==='string'&&/^[a-zA-Z0-9-]{1,128}$/.test(requestId)?requestId:undefined;
  const message=base+(typeof status==='number'?` (HTTP ${status}${code?` · ${code}`:''})`:'')+(reference?` Referencia: ${reference}`:'');
  throw new MatchDraftRequestError(message,typeof failure?.transcript==='string'&&failure.transcript.length<=12000?failure.transcript:undefined);
 }
 if(data?.error)throw new Error(String(data.error));
 return data;
}
export async function interpretMatchRecording(teamId:string,uri:string,roster:HierarchyItem[]):Promise<{draft:MatchDraft;transcript:string}>{
 const body=new FormData();body.append('teamId',teamId);
 if(Platform.OS==='web'){
  const response=await fetch(uri),blob=await response.blob();body.append('audio',blob,'match.webm');
 }else{
  const recording=new File(uri);
  if(!recording.exists||recording.size===0)throw new Error('La grabación está vacía o ya no está disponible. Vuelve a grabarla.');
  if(recording.size>10*1024*1024)throw new Error('La grabación supera los 10 MB permitidos. Graba un audio más corto.');
  // SDK 58 expo/fetch rejects legacy {uri,name,type} multipart parts before HTTP.
  // File implements bytes(), which Expo serializes as the actual recording.
  body.append('audio',recording,'match.m4a');
 }
 const data=await request(body);
 if(typeof data?.transcript!=='string'||!data.transcript.trim()||data.transcript.length>12000)throw new Error('No se ha entendido la grabación. Puedes escribir el partido.');
 return {transcript:data.transcript,draft:parseMatchDraft(data.draft,roster.map(p=>({player_id:p.id,player_name:p.name})))};
}
export async function interpretMatch(teamId:string,text:string,roster:HierarchyItem[]):Promise<MatchDraft>{
 const data=await request({teamId,text});
 return parseMatchDraft(data?.draft,roster.map(player=>({player_id:player.id,player_name:player.name})));
}
