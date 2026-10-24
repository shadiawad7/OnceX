import { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import ProfilePhotoDisplay from './ProfilePhotoDisplay';
import { storedCardPhotoUrl } from '../lib/cardPhotos';
export default function CardPlayerPortrait({id,name}:{id:string;name:string}){
 const [stored,setStored]=useState<{id:string;url:string|null}>();
 const url=stored?.id===id?stored.url:null;
 useEffect(()=>{let active=true;void storedCardPhotoUrl(id).then(value=>{if(active)setStored({id,url:value});});return()=>{active=false;};},[id]);
 return url?<Image source={{uri:url}} accessibilityLabel={`Foto de ${name}`} resizeMode="contain" style={styles.photo} onError={()=>setStored({id,url:null})}/>:<ProfilePhotoDisplay id={id} name={name} style={styles.photo}/>;
}
const styles=StyleSheet.create({photo:{width:'100%',height:'100%',borderRadius:0,marginVertical:0,backgroundColor:'transparent'}});
