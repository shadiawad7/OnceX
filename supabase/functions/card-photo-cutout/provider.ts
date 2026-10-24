/** Only this adapter knows the temporary provider and its credentials. */
export interface BackgroundRemovalProvider { removeBackground(original: Blob): Promise<Uint8Array<ArrayBuffer>> }
export function backgroundRemovalProvider(): BackgroundRemovalProvider {
 const key=Deno.env.get('REMOVE_BG_API_KEY');
 if(!key)throw new Error('PROVIDER_NOT_CONFIGURED');
 return {async removeBackground(original){
  const form=new FormData();form.append('image_file',original,'portrait');form.append('size','auto');form.append('format','png');form.append('type','person');
  const response=await fetch('https://api.remove.bg/v1.0/removebg',{method:'POST',headers:{'X-Api-Key':key},body:form,signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw new Error(`PROVIDER_HTTP_${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length>5*1024*1024||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw new Error('INVALID_PNG');
  return bytes;
 }};
}
