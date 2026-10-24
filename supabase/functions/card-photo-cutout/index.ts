import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { backgroundRemovalProvider } from './provider.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const hash=async(blob:Blob)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(request.method!=='POST')return reply(405,{error:'Método no permitido.'});
 try{
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const token=request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if(!url||!key||!token)return reply(401,{error:'Inicia sesión.'});
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=await admin.auth.getUser(token);
  if(auth.error||!auth.data.user)return reply(401,{error:'Sesión no válida.'});
  let input;try{input=await request.json();}catch{return reply(400,{error:'Petición no válida.'});}
  const {target_user:target,mode,upload_id:uploadId}=input??{};
  if(uploadId!==undefined&&(typeof uploadId!=='string'||!/^[-a-z0-9]{8,80}$/i.test(uploadId)))return reply(400,{error:'Subida no válida.'});
  if(typeof target!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target)||!['read','process'].includes(mode))return reply(400,{error:'Petición no válida.'});
  const caller=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const profile=await caller.from('profiles').select('photo_path').eq('id',target).maybeSingle();
  if(profile.error||!profile.data)return reply(403,{error:'No puedes consultar esta foto.'});
  if(!profile.data.photo_path)return reply(200,{status:'missing',url:null});
  if(profile.data.photo_path!==`${target}/portrait`)return reply(403,{error:'Ruta no válida.'});
  const bucket=admin.storage.from('profile-photos');
  const original=await bucket.download(profile.data.photo_path);
  if(original.error||!original.data)return reply(200,{status:'missing',url:null});
  const source=original.data;
  if(source.size>5*1024*1024)return reply(413,{error:'Foto demasiado grande.'});
  const fingerprint=await hash(source),path=`${target}/card-${fingerprint}.png`,claim=`${target}/card-${fingerprint}-${uploadId||'legacy'}.claim`;
  const cached=await bucket.download(path);
  if(cached.error||!cached.data){
   // Display requests NEVER enter the provider branch, even on cache miss.
   if(mode==='read')return reply(200,{status:'missing',url:null});
   // Reuse existing photo-write authorization; never infer it from read access.
   const allowed=await caller.rpc('attach_profile_photo',{target_user:target});
   if(allowed.error)return reply(403,{error:'No puedes modificar esta foto.'});
   const membership=await admin.from('team_members').select('user_id').eq('user_id',target).eq('role_code','player').limit(1);
   if(membership.error||!membership.data?.length)return reply(200,{status:'not_player',url:null});
   const provider=backgroundRemovalProvider();
   // Storage's unique object key prevents concurrent instances charging twice.
   // A failed/crashed claim is retained: no automatic retries or display-triggered charges.
   const marker=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),char=>char.charCodeAt(0));
   const claimed=await bucket.upload(claim,marker,{contentType:'image/png',upsert:false});
   if(claimed.error)return reply(200,{status:'pending_or_failed',code:'PROCESSING_CLAIM_EXISTS',url:null});
   let bytes;
   try{bytes=await provider.removeBackground(source);}catch(error){const code=error instanceof Error&&/^(PROVIDER_HTTP_[0-9]{3}|INVALID_PNG)$/.test(error.message)?error.message:'PROVIDER_FAILED';return reply(200,{status:'failed',code,url:null});}
   const latest=await bucket.download(profile.data.photo_path);
   if(latest.error||!latest.data||await hash(latest.data)!==fingerprint)return reply(200,{status:'superseded',url:null});
   const saved=await bucket.upload(path,bytes,{contentType:'image/png',upsert:false,cacheControl:'3600'});
   if(saved.error)return reply(200,{status:'failed',code:'CUTOUT_STORAGE_FAILED',url:null});
  }
  const signed=await bucket.createSignedUrl(path,3600);
  if(signed.error||!signed.data?.signedUrl)return reply(200,{status:'missing',url:null});
  return reply(200,{status:'ready',url:signed.data.signedUrl});
 }catch(error){return reply(503,{code:error instanceof Error&&error.message==='PROVIDER_NOT_CONFIGURED'?'PROVIDER_NOT_CONFIGURED':'CUTOUT_UNAVAILABLE',error:'Recorte no disponible. La foto original se conserva.'});}
});
