import { decode } from 'base64-arraybuffer';
import { client } from './hierarchy';
import type { ProfilePhoto } from './profilePhotos';
export async function saveClubPhoto(clubId:string,photo:ProfilePhoto) {
 const schema=await client().from('clubs').select('photo_path').eq('id',clubId).single();
 if(schema.error)throw new Error(['42703','PGRST204'].includes(schema.error.code)?'Las fotos de clubes no están activadas. Ejecuta la migración 202610120002_club_photos.sql en Supabase.':`No se puede acceder al club: ${schema.error.message}`);
 const result=await client().storage.from('club-photos').upload(`${clubId}/portrait`,decode(photo.base64),{contentType:photo.contentType,upsert:true,cacheControl:'60'});
 if(result.error)throw new Error(`No se ha guardado la foto del club: ${result.error.message}`);
 const attached=await client().rpc('attach_club_photo',{target_club:clubId});
 if(attached.error)throw new Error(`La foto se ha subido, pero no se ha vinculado al club: ${attached.error.message}`);
}
export async function clubPhotoUrls(paths:string[]) {
 const unique=[...new Set(paths.filter(Boolean))];
 if(!unique.length)return new Map<string,string>();
 const result=await client().storage.from('club-photos').createSignedUrls(unique,3600);
 if(result.error)return new Map<string,string>();
 const version=Date.now();
 return new Map(result.data.filter(item=>item.path&&item.signedUrl).map(item=>[item.path!,`${item.signedUrl!}&v=${version}`]));
}
