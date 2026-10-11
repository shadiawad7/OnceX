import { useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
export default function ProfilePortrait({url,name,style}:{url?:string;name:string;style?:StyleProp<ViewStyle>}) {
 const [failed,setFailed]=useState(false);
 return <View style={[styles.container,style]}>{url&&!failed ? <Image accessibilityLabel={`Foto de ${name}`} source={{uri:url}} style={StyleSheet.absoluteFill} resizeMode="cover" onError={()=>setFailed(true)}/> : <Text style={styles.initials}>{name.split(' ').filter(Boolean).slice(0,2).map(word=>word[0]).join('')}</Text>}</View>;
}
const styles=StyleSheet.create({container:{backgroundColor:colors.surfaceElevated,alignItems:'center',justifyContent:'center',overflow:'hidden'},initials:{color:colors.muted,fontSize:20,fontWeight:'800'}});
