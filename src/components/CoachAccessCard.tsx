import type { ComponentProps } from 'react';
import { useId, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import ClubBadge from './ClubBadge';
import { colors } from '../theme/colors';

// Tamaño de TODA la carta: 100 = original; 80 = más pequeña; 130 = más grande.
// Escala también iconos, textos, bordes y separaciones.
const COACH_CARD_SIZE_PERCENT = 100;
const BASE_CARD_WIDTH = 160;
const BASE_CARD_HEIGHT = 280;

type Props={clubBadgeUrl?:string;title:string;description:string;category:string;icon:ComponentProps<typeof MaterialCommunityIcons>['name'];onPress:()=>void};
const shape='M20 4 H160 L176 20 V236 L156 256 H4 V20 Z';

export default function CoachAccessCard({title,description,category,onPress,clubBadgeUrl}:Props){
 const id=useId().replace(/:/g,'');
 const [baseHeight,setBaseHeight]=useState(BASE_CARD_HEIGHT);
 const cardScale=Math.max(1,COACH_CARD_SIZE_PERCENT)/99;
 return <View style={[styles.slot,{width:BASE_CARD_WIDTH*cardScale,height:baseHeight*cardScale}]}><Pressable onLayout={event=>setBaseHeight(event.nativeEvent.layout.height)} accessibilityRole="button" accessibilityLabel={`${title}. ${category}. ${description}`} onPress={onPress} style={({pressed})=>[styles.card,{transform:[{scale:cardScale}]},pressed&&styles.pressed]}>
  <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
   <Svg width="100%" height="100%" viewBox="0 0 180 260" preserveAspectRatio="none" fill="none" aria-hidden>
    <Defs>
     <ClipPath id={id+'clip'}><Path d={shape}/></ClipPath>
     <LinearGradient id={id+'body'} x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#3B1019"/><Stop offset="0.55" stopColor="#140D12"/><Stop offset="1" stopColor="#08090D"/></LinearGradient>
     <LinearGradient id={id+'rim'} x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#FF6576"/><Stop offset="0.45" stopColor="#89152C"/><Stop offset="0.8" stopColor="#FF2438"/><Stop offset="1" stopColor="#5B1828"/></LinearGradient>
    </Defs>
    <Path d={shape} fill={`url(#${id}body)`} stroke={`url(#${id}rim)`} strokeWidth="1.2"/>
    <G clipPath={`url(#${id}clip)`}>
     <Path d="M112 0 L180 0 V104 Z" fill="#EF1836" opacity="0.12"/>
     <Path d="M120 0 L180 90 M138 0 L180 63" stroke="#FF5269" strokeWidth="0.6" opacity="0.18"/>
    </G>
    <Path d="M20 5 H66 M175 190 V235 L155 255 H119" stroke="#FF3C55" strokeWidth="3"/>
   </Svg>
  </View>
  {!!clubBadgeUrl&&<View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.badgeCrop}><View style={styles.halfBadge}><ClubBadge key={clubBadgeUrl} url={clubBadgeUrl} size={180}/></View></View>}
  <Text style={styles.category}>{category}</Text>
  <View style={styles.copy}>
   <Text style={styles.title}>{title}</Text>
   <View style={styles.accent}/>
   <Text style={styles.description}>{description}</Text>
  </View>
  <View style={styles.open}><Text style={styles.openLabel}>EXPLORAR</Text><Text style={styles.arrow}>↗</Text></View>
 </Pressable></View>;
}
const styles=StyleSheet.create({
 slot:{position:'relative'},
 badgeCrop:{position:'absolute',left:4,right:4,top:54,bottom:40,overflow:'hidden',justifyContent:'center'},
 halfBadge:{position:'absolute',left:-90,opacity:0.18},
 card:{position:'absolute',top:0,left:0,width:BASE_CARD_WIDTH,minHeight:BASE_CARD_HEIGHT,transformOrigin:'top left',paddingTop:22,paddingBottom:24,paddingHorizontal:18,alignItems:'flex-start'},
 category:{color:'#F495A4',fontSize:9,fontWeight:'800',letterSpacing:1.1,marginBottom:16},
 pressed:{opacity:0.75},copy:{flex:1,justifyContent:'flex-start',alignSelf:'stretch',paddingTop:8,paddingBottom:36},accent:{width:24,height:3,backgroundColor:colors.redBright,marginTop:12,marginBottom:12},
 title:{fontSize:20,lineHeight:27,fontWeight:'900',color:colors.white,textAlign:'left',alignSelf:'stretch'},
 description:{color:'#C7B8BF',fontSize:16,lineHeight:19,textAlign:'left',alignSelf:'stretch'},
 open:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:7,alignSelf:'stretch',paddingTop:14,borderTopWidth:1,borderTopColor:'rgba(255,82,105,0.2)'},
 arrow:{color:colors.redBright,fontSize:20,lineHeight:22},
 openLabel:{color:'#F7D9DF',fontSize:10,fontWeight:'900',letterSpacing:1.2}
});
