import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
export default function ClubBadge({url,name='Club',size=108,onError}:{url?:string;name?:string;size?:number;onError?:()=>void}) {
 const [failed,setFailed]=useState(false);
 return <View style={[styles.circle,{width:size,height:size,borderRadius:size/2,padding:size*0.12}]}>{url&&!failed?<Image source={{uri:url}} accessibilityLabel={`Escudo de ${name}`} resizeMode="contain" style={[styles.image,{borderRadius:size/2}]} onError={()=>{setFailed(true);onError?.();}}/>:<Text style={styles.initials}>{name.split(' ').filter(Boolean).slice(0,2).map(word=>word[0]).join('')}</Text>}</View>;
}
const styles=StyleSheet.create({circle:{alignItems:'center',justifyContent:'center',backgroundColor:'transparent',borderWidth:0,overflow:'hidden'},image:{overflow:'hidden',width:'100%',height:'100%'},initials:{color:colors.white,fontSize:26,fontWeight:'900'}});
