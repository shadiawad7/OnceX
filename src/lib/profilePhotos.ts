import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { client } from './hierarchy';
export type ProfilePhoto = { uri: string; base64: string; contentType: string };
export async function chooseProfilePhoto(): Promise<ProfilePhoto | null> {
 const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[3,4],quality:0.65,base64:true});
 if(result.canceled) return null;
 const asset=result.assets[0];
 if(!asset.base64) throw new Error('No se ha podido leer la foto. Selecciona otra imagen.');
 const bytes=new Uint8Array(decode(asset.base64));
 const jpeg=bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
 const png=bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71;
 const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!jpeg&&!png&&!webp) throw new Error('Selecciona una foto JPG, PNG o WebP.');
 if(bytes.byteLength>5*1024*1024) throw new Error('La foto debe ocupar menos de 5 MB.');
 return {uri:asset.uri,base64:asset.base64,contentType:jpeg?'image/jpeg':png?'image/png':'image/webp'};
}
export async function saveProfilePhoto(userId: string, photo: ProfilePhoto) {
 const result=await client().storage.from('profile-photos').upload(`${userId}/portrait`,decode(photo.base64),{contentType:photo.contentType,upsert:true,cacheControl:'60'});
 if(result.error) throw new Error('La cuenta está creada, pero no se ha guardado la foto. Comprueba que las fotos están activadas en Supabase y reintenta.');
 const attached=await client().rpc('attach_profile_photo',{target_user:userId});
 if(attached.error) throw new Error('La foto se ha subido, pero no se ha vinculado a la ficha. Reintenta guardar la foto.');
}
export async function profilePhotoUrls(paths: string[]): Promise<Map<string,string>> {
 const unique=[...new Set(paths.filter(Boolean))];
 if(!unique.length) return new Map();
 const result=await client().storage.from('profile-photos').createSignedUrls(unique,3600);
 if(result.error) return new Map();
 return new Map(result.data.filter(item=>!!item.signedUrl&&!!item.path).map(item=>[item.path!,item.signedUrl!]));
}
