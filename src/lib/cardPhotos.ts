import { Alert, Platform } from 'react-native';
import { client } from './client';
export type CardPhotoSource = { playerId: string; originalPath: string };
/** Upload-only entry point. Failure must never invalidate the original upload. */
export async function onPlayerPhotoSaved(source:CardPhotoSource):Promise<void>{
 let message='La foto original está guardada, pero no se ha podido eliminar el fondo. Vuelve a subirla para reintentarlo.';
 try{
  const uploadId=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result=await client().functions.invoke('card-photo-cutout',{body:{target_user:source.playerId,mode:'process',upload_id:uploadId}});
  if(!result.error&&['ready','not_player'].includes(result.data?.status))return;
  let code=result.data?.code;
  if(result.error&&'context' in result.error&&result.error.context instanceof Response){try{code=(await result.error.context.json()).code;}catch{/* Keep the generic notice. */}}
  if(code==='PROVIDER_NOT_CONFIGURED')message='La foto original está guardada. Falta configurar el proveedor de recorte en el servidor.';
  if(code==='PROVIDER_HTTP_402')message='La foto original está guardada. Remove.bg indica que no hay créditos disponibles para este recorte.';
  else if(code==='PROVIDER_HTTP_401'||code==='PROVIDER_HTTP_403')message='La foto original está guardada. Remove.bg ha rechazado la clave configurada en el servidor.';
  else if(code==='PROVIDER_HTTP_429')message='La foto original está guardada. Remove.bg ha limitado temporalmente las solicitudes; vuelve a subirla más tarde.';
 }catch{/* Original remains available. */}
 showCutoutNotice(message);
}
/** Reads a persisted cutout only. This operation cannot start processing. */
export async function storedCardPhotoUrl(playerId:string):Promise<string|null>{
 try{
  const result=await client().functions.invoke('card-photo-cutout',{body:{target_user:playerId,mode:'read'}});
  return !result.error&&result.data?.status==='ready'&&typeof result.data.url==='string'?result.data.url:null;
 }catch{return null;}
}

function showCutoutNotice(message:string){
 if(Platform.OS==='web'){if(typeof window!=='undefined')window.alert(message);}
 else Alert.alert('Foto guardada · Recorte pendiente',message);
}
