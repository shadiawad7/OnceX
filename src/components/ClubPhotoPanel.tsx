import ClubBadge from './ClubBadge';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { client } from '../lib/hierarchy';
import { chooseProfilePhoto } from '../lib/profilePhotos';
import { clubPhotoUrls, saveClubPhoto } from '../lib/clubPhotos';
import { colors } from '../theme/colors';
export default function ClubPhotoPanel({id,editable}:{id:string;editable:boolean}) {
 const [url,setUrl]=useState<string>(),[hasPhoto,setHasPhoto]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useFocusEffect(useCallback(()=>{let active=true;void(async()=>{
  const result=await client().from('clubs').select('photo_path').eq('id',id).single();
  if(result.error)return;
  const path=result.data.photo_path;
  const urls=await clubPhotoUrls(path?[path]:[]);
  if(active){setHasPhoto(!!path);setUrl(path?urls.get(path):undefined);}
 })().catch(()=>{});return()=>{active=false;};},[id]));
 async function update(){if(busy)return;setBusy(true);setMessage('');try{
  const photo=await chooseProfilePhoto([1,1],false);if(!photo)return;
  await saveClubPhoto(id,photo);setUrl(photo.uri);setHasPhoto(true);setMessage('Foto del club guardada.');
 }catch(reason){setMessage(reason instanceof Error?reason.message:'No se ha podido guardar la foto.');}finally{setBusy(false);}}
 return <View style={styles.panel}><View style={{alignItems:'center'}}><ClubBadge key={url} url={url} size={108}/></View>{editable&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void update();}} style={styles.changePhoto}><Text style={styles.changePhotoText}>{busy?'GUARDANDO FOTO…':hasPhoto?'CAMBIAR FOTO DEL CLUB':'AÑADIR FOTO DEL CLUB'}</Text></Pressable>}{!!message&&<Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}</View>;
}
const styles=StyleSheet.create({panel:{marginBottom:22},changePhoto:{alignSelf:'center',paddingHorizontal:14,paddingVertical:14},changePhotoText:{color:colors.redBright,fontSize:11,fontWeight:'800'},photo:{width:'100%',height:180,borderRadius:16},empty:{height:110,borderRadius:16,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border},text:{color:colors.muted,textAlign:'center'},message:{color:colors.white,marginTop:12,lineHeight:20}});
