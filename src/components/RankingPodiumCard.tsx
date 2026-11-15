import { useEffect, useId, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { LinearGradient as NameGradient } from 'expo-linear-gradient';
import ProfilePortrait from './ProfilePortrait';
import { client } from '../lib/client';
import type { RankingPlayer } from '../lib/rankings';
import { podiumGoldColorPercent, podiumSilverColorPercent, podiumBronzeColorPercent, podiumShadowOpacityPercent } from '../theme/colors';

// Escala de toda la carta. 100 = tamaño calculado para que quepan las tres.
const PODIUM_CARD_SIZE_PERCENT=100;
const BASE_CARD_WIDTH=240;
const outline='M120 9 L140 23 L157 19 Q195 51 232 66 V345 Q232 362 214 371 L147 394 L120 412 L93 394 L26 371 Q8 362 8 345 V66 Q45 51 83 19 L100 23 Z';
const palettes={
 1:{light:'#FFF8D1',metal:'#FFCE47',shade:'#8E580A',base:'#1B1205',facet:'#BE8B13',beam:'#FFF2A1'},
 2:{light:'#F0F9FF',metal:'#C1D5E9',shade:'#47627E',base:'#071420',facet:'#326C9D',beam:'#AEE1FF'},
 3:{light:'#FFE6CF',metal:'#F49E64',shade:'#914829',base:'#251109',facet:'#AF4C22',beam:'#FFD5B2'},
} as const;
const metrics=[{label:'PJ',key:'Partidos'},{label:'MIN',key:'Minutos'},{label:'GOL',key:'Goles'},{label:'ASI',key:'Asistencias'}] as const;
export default function RankingPodiumCard({player,place,canOpen,onOpen,width=180}:{player?:RankingPlayer;place:1|2|3;canOpen:boolean;onOpen:()=>void;width?:number}){
 const id=useId().replace(/:/g,'');
 const [totals,setTotals]=useState<{playerId:string;values:Record<string,number|null>}|null>(null);
 const playerId=player?.player_id;
 useEffect(()=>{let active=true;if(!playerId)return;
  void (async()=>{const {data,error}=await client().rpc('player_match_totals',{target_player:playerId});if(active)setTotals(error?null:{playerId,values:data as Record<string,number|null>});})().catch(()=>{if(active)setTotals(null);});
  return()=>{active=false;};
 },[playerId]);
 const scale=width/BASE_CARD_WIDTH*Math.max(1,PODIUM_CARD_SIZE_PERCENT)/100;
 const height=place===1?436:420;
 const shade=palettes[place];
 const intensity=Math.min(100,Math.max(0,{1:podiumGoldColorPercent,2:podiumSilverColorPercent,3:podiumBronzeColorPercent}[place]))/100;
 const glow=Math.min(100,Math.max(0,podiumShadowOpacityPercent))/100;
 const values=totals?.playerId===playerId?totals?.values:null;
 return <View style={{width:BASE_CARD_WIDTH*scale,height:(height+16)*scale,flexShrink:0}}>
  <Pressable accessibilityRole="button" accessibilityLabel={`${place}º puesto. ${player?.full_name??'Pendiente'}. ONCEX Score ${player?.oncex_score??'sin evaluar'}`} accessibilityState={{disabled:!player||!canOpen}} disabled={!player||!canOpen} onPress={onOpen} style={({pressed})=>[styles.card,{width:BASE_CARD_WIDTH,height,top:8*scale,transform:[{scale}]},pressed&&{opacity:0.8}]}>
   <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox="0 0 240 420" preserveAspectRatio="none" fill="none">
     <Defs>
      <ClipPath id={id+'clip'}><Path d={outline}/></ClipPath>
      <LinearGradient id={id+'metal'} x1="0" y1="0" x2="1" y2="1"><Stop stopColor={shade.light}/><Stop offset="0.2" stopColor={shade.metal}/><Stop offset="0.39" stopColor={shade.shade}/><Stop offset="0.52" stopColor={shade.light}/><Stop offset="0.75" stopColor={shade.metal}/><Stop offset="0.92" stopColor={shade.light}/><Stop offset="1" stopColor={shade.shade}/></LinearGradient>
      <LinearGradient id={id+'body'} x1="0" y1="0" x2="1" y2="1"><Stop stopColor={shade.base}/><Stop offset="0.48" stopColor={shade.shade} stopOpacity={0.7*intensity}/><Stop offset="1" stopColor="#05080D"/></LinearGradient>
      <LinearGradient id={id+'beam'} x1="0" y1="1" x2="1" y2="0"><Stop stopColor={shade.facet} stopOpacity="0"/><Stop offset="0.58" stopColor={shade.metal} stopOpacity={0.75*intensity}/><Stop offset="0.87" stopColor={shade.light}/><Stop offset="1" stopColor={shade.beam}/></LinearGradient>
     </Defs>
     <Path d={outline} stroke={shade.metal} strokeWidth="13" opacity={0.07*glow}/>
     <Path d={outline} stroke={shade.metal} strokeWidth="7" opacity={0.22*glow}/>
     <Path d={outline} fill={shade.base} stroke={`url(#${id}metal)`} strokeWidth="3.5"/>
     <G clipPath={`url(#${id}clip)`}>
      <Path d="M0 0 H240 V420 H0 Z" fill={`url(#${id}body)`}/>
      <Path d="M-30 193 L203 27 L130 117 L233 64 L75 234 Z" fill={`url(#${id}beam)`}/>
      <Path d="M-20 93 L117 26 L38 108 L196 43 L89 159 Z" fill={shade.facet} opacity={0.55*intensity}/>
      <Path d="M-15 250 L254 86 L174 173 L233 145 L43 306 Z" fill={`url(#${id}beam)`} opacity={0.8*intensity}/>
      <Path d="M15 328 L198 190 L154 254 L255 202 L117 354 Z" fill={shade.facet} opacity={0.3*intensity}/>
      <Path d="M17 147 L166 38 L97 109 L193 61 M-5 219 L218 61 M24 254 L215 132 M21 315 L213 190 M38 372 L147 292 L114 370 L181 337" stroke={shade.light} strokeWidth="0.7" opacity={0.3*intensity}/>
      <Path d="M12 71 L51 86 L21 139 L86 124 L55 190 L136 162 L98 242 L174 218" stroke={shade.shade} strokeWidth="2" opacity="0.8"/>
      <Path d="M16 345 L119 401 L222 345 L120 387 Z" fill={shade.metal} opacity={0.12*intensity}/>
     </G>
     <Path d={outline} transform="translate(4.8 7) scale(0.96 0.965)" stroke={shade.light} strokeWidth="1" opacity="0.85"/>
     <Path d={outline} transform="translate(8 11) scale(0.935 0.945)" stroke={shade.metal} strokeWidth="0.8" opacity="0.65"/>
     <Path d="M52 42 L83 20 L99 26 M141 26 L157 20 L187 42 M17 332 V346 Q17 356 32 363 L93 386 M223 332 V346 Q223 356 208 363 L147 386" stroke={shade.light} strokeWidth="2.3"/>
    </Svg>
   </View>
   <View style={styles.photo}><ProfilePortrait key={player?.photo_url??playerId??'empty'} url={player?.photo_url} name={player?.full_name??''} style={styles.portrait} alignTop/></View>
   <View style={styles.score}><Text style={styles.scoreLabel}>ONCEX</Text><Text style={styles.scoreLabel}>SCORE</Text><Text maxFontSizeMultiplier={1} numberOfLines={1} adjustsFontSizeToFit style={[styles.scoreValue,{color:shade.light}]}>{player?.oncex_score??'—'}</Text></View>
   <NameGradient pointerEvents="none" colors={['transparent',shade.base+'B8',shade.base]} locations={[0,0.55,1]} style={styles.photoFade}/>
   <NameGradient colors={[shade.shade+'D9','#080B10',shade.base]} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.nameBand,{borderColor:shade.metal+'90'}]}>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={1} style={styles.name}>{player?.full_name?.toLocaleUpperCase('es')||'PENDIENTE'}</Text>
   </NameGradient>
   <View style={[styles.positionBand,{borderBottomColor:shade.metal+'80'}]}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.position,{color:shade.light}]}>{player?.player_position?.toLocaleUpperCase('es')||'SIN POSICIÓN'}</Text></View>
   <View style={styles.stats}>{metrics.map((metric,index)=><View key={metric.key} style={[styles.stat,index>0&&{borderLeftWidth:0.6,borderLeftColor:shade.light+'38'}]}><Text style={styles.statLabel}>{metric.label}</Text><Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1} style={styles.statValue}>{values?.[metric.key]??'—'}</Text></View>)}</View>
   <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox="0 0 240 420" preserveAspectRatio="none" fill="none">
     <Circle cx="120" cy="37" r="29" fill={shade.base} stroke={shade.metal} strokeWidth="1.5"/>
     <Path d="M115 68 Q77 59 87 16 M125 68 Q163 59 153 16" stroke={shade.metal} strokeWidth="1.3"/>
     {Array.from({length:7},(_,i)=>{const y=17+i*7,x=87+Math.max(0,i-2)*2.4;return <G key={i}><Ellipse cx={x-3} cy={y} rx="2.5" ry="6" rotation={-35-i*5} origin={`${x-3}, ${y}`} fill={i%2?shade.metal:shade.light}/><Ellipse cx={240-x+3} cy={y} rx="2.5" ry="6" rotation={35+i*5} origin={`${240-x+3}, ${y}`} fill={i%2?shade.metal:shade.light}/></G>;})}
     <Path d="M112 70 L120 65 L128 70 M114 410 L120 414 L126 410" stroke={shade.light} strokeWidth="1.5"/>
    </Svg>
   </View>
   <View style={styles.medal}><Text maxFontSizeMultiplier={1} style={[styles.place,{color:shade.light}]}>{place}</Text></View>
   {place===1&&<MaterialCommunityIcons pointerEvents="none" name="crown" size={23} color={shade.light} style={styles.crown}/>}
  </Pressable>
 </View>;
}
const styles=StyleSheet.create({
 card:{position:'absolute',top:8,left:0,transformOrigin:'top left'},
 photo:{position:'absolute',top:'17%',left:'4%',right:'4%',bottom:'28%',overflow:'hidden'},portrait:{width:'100%',height:'100%',backgroundColor:'transparent'},
 photoFade:{position:'absolute',left:'4%',right:'4%',bottom:'27%',height:'17%'},
 score:{position:'absolute',top:'18%',right:'9%',width:58,alignItems:'center',paddingVertical:3,backgroundColor:'rgba(5,8,12,0.36)',borderRadius:4},scoreLabel:{color:'#FFFFFF',fontSize:12,lineHeight:13,fontWeight:'800',letterSpacing:0.6},scoreValue:{fontSize:37,lineHeight:42,fontWeight:'900',fontVariant:['tabular-nums'],maxWidth:57},
 medal:{position:'absolute',top:'2.8%',left:92,width:56,height:49,alignItems:'center',justifyContent:'center'},place:{fontSize:40,lineHeight:46,fontWeight:'900'},crown:{position:'absolute',top:-2,left:109},
 nameBand:{position:'absolute',left:'5%',right:'5%',top:'67%',height:36,borderTopWidth:0.8,borderBottomWidth:0.8,justifyContent:'center',paddingHorizontal:9},name:{color:'#FFFFFF',fontSize:28,lineHeight:34,fontStyle:'italic',fontWeight:'900',letterSpacing:0.8,textAlign:'center'},
 positionBand:{position:'absolute',left:'9%',right:'9%',top:'75%',height:20,justifyContent:'center',borderBottomWidth:0.6},position:{fontSize:15,lineHeight:19,fontStyle:'italic',fontWeight:'700',textAlign:'center'},
 stats:{position:'absolute',left:'15%',right:'15%',top:'80%',height:33,flexDirection:'row'},stat:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:2},statLabel:{color:'#EAE6DE',fontSize:10,lineHeight:12,fontWeight:'600'},statValue:{color:'#FFFFFF',fontSize:18,lineHeight:21,fontWeight:'800',fontVariant:['tabular-nums']},
});
