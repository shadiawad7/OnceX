import { useEffect, useState } from 'react';
import ProfilePortrait from './ProfilePortrait';
import { client } from '../lib/hierarchy';
import { profilePhotoUrls } from '../lib/profilePhotos';
export default function ProfilePhotoDisplay({id,name}:{id:string;name:string}) {
 const [url,setUrl]=useState<string>();
 useEffect(()=> {let active=true;void (async()=> {const result=await client().from('profiles').select('photo_path').eq('id',id).single();if(result.error||!result.data.photo_path)return;const urls=await profilePhotoUrls([result.data.photo_path]);if(active)setUrl(urls.get(result.data.photo_path));})().catch(()=>{});return()=>{active=false;};},[id]);
 return <ProfilePortrait key={url} name={name} url={url} style={{width:108,height:144,borderRadius:12,alignSelf:'center',marginVertical:16}}/>;
}
