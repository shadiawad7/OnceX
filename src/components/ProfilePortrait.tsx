import FeatheredCardPhoto from './FeatheredCardPhoto';
import { useState } from 'react';
import Svg, { Image as SvgImage } from 'react-native-svg';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
export default function ProfilePortrait({url,name,style,feathered=false,alignTop=false}:{url?:string;name:string;style?:StyleProp<ViewStyle>;feathered?:boolean;alignTop?:boolean}) {
 const [failed,setFailed]=useState(false);
 return <View style={[styles.container,url&&!failed&&{backgroundColor:'transparent'},style]}>{url&&!failed ? feathered ? <FeatheredCardPhoto url={url} name={name} onError={()=>setFailed(true)}/> : alignTop ? <Svg width="100%" height="100%" accessibilityLabel={`Foto de ${name}`}><SvgImage href={{uri:url}} width="100%" height="100%" preserveAspectRatio="xMidYMin slice"/></Svg> : <Image accessibilityLabel={`Foto de ${name}`} source={{uri:url}} style={StyleSheet.absoluteFill} resizeMode="cover" onError={()=>setFailed(true)}/> : <Text style={styles.initials}>{name.split(' ').filter(Boolean).slice(0,2).map(word=>word[0]).join('')}</Text>}</View>;
}
const styles=StyleSheet.create({container:{backgroundColor:colors.surfaceElevated,alignItems:'center',justifyContent:'center',overflow:'hidden'},initials:{color:colors.muted,fontSize:20,fontWeight:'800'}});
