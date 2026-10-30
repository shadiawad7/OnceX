import { Platform } from 'react-native';
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
  const message=typeof failure?.error==='string'?failure.error:context?.status===401?'La sesión ha caducado. Vuelve a iniciar sesión.':context?.status===404?'El asistente de partidos aún no está desplegado en Supabase.':'No se puede conectar con el asistente. Comprueba la conexión o continúa manualmente.';
  throw new MatchDraftRequestError(message,typeof failure?.transcript==='string'&&failure.transcript.length<=12000?failure.transcript:undefined);
 }
 if(data?.error)throw new Error(String(data.error));
 return data;
}
export async function interpretMatchRecording(teamId:string,uri:string,roster:HierarchyItem[]):Promise<{draft:MatchDraft;transcript:string}>{
 const body=new FormData();body.append('teamId',teamId);
 if(Platform.OS==='web'){
  const response=await fetch(uri),blob=await response.blob();body.append('audio',blob,'match.webm');
 }else body.append('audio',{uri,name:'match.m4a',type:'audio/mp4'} as unknown as Blob);
 const data=await request(body);
 if(typeof data?.transcript!=='string'||!data.transcript.trim()||data.transcript.length>12000)throw new Error('No se ha entendido la grabación. Puedes escribir el partido.');
 return {transcript:data.transcript,draft:parseMatchDraft(data.draft,roster.map(p=>({player_id:p.id,player_name:p.name})))};
}
export async function interpretMatch(teamId:string,text:string,roster:HierarchyItem[]):Promise<MatchDraft>{
 const data=await request({teamId,text});
 return parseMatchDraft(data?.draft,roster.map(player=>({player_id:player.id,player_name:player.name})));
}
