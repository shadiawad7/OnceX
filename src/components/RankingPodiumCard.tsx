import { useId } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import ProfilePortrait from './ProfilePortrait';
import { LinearGradient as NameGradient } from 'expo-linear-gradient';
import type { RankingPlayer } from '../lib/rankings';
import { podiumGoldColorPercent, podiumSilverColorPercent, podiumBronzeColorPercent, podiumShadowOpacityPercent } from '../theme/colors';

// Tamaño de toda la carta: foto, texto, marco y corona. 100 = normal, 80 = menor, 120 = mayor.
const PODIUM_CARD_SIZE_PERCENT = 100;
const BASE_CARD_WIDTH = 180;

// Silueta de la OnceX Card, adaptada al tamaño del podio.
const silhouette='M90 5 C82 14 74 19 65.5 12 H57.5 C41.5 16 27 36 7 44 V271.5 C7 283 21.5 286.5 37.5 292 L72.5 306 Q83.5 311 90 317 Q96.5 311 107.5 306 L142.5 292 C158.5 286.5 173 283 173 271.5 V44 C153 36 138.5 16 122.5 12 H114.5 C106 19 98 14 90 5 Z';
const metals={1:['#FFF1B5','#D8B65E','#715120'],2:['#F1F5FA','#B4C0CE','#505E70'],3:['#FFD0AC','#CE8B5B','#6F3C2D']} as const;
export default function RankingPodiumCard({player,place,canOpen,onOpen,width=180}:{player?:RankingPlayer;place:1|2|3;canOpen:boolean;onOpen:()=>void;width?:number}){
 const id=useId().replace(/:/g,'');
 const scale=(width/BASE_CARD_WIDTH)*Math.max(1,PODIUM_CARD_SIZE_PERCENT)/100;
 const height=place===1?364:340;
 const shades=metals[place];
 const opacity=Math.min(100,Math.max(0,{1:podiumGoldColorPercent,2:podiumSilverColorPercent,3:podiumBronzeColorPercent}[place]))/100;
 const shadow=Math.min(100,Math.max(0,podiumShadowOpacityPercent))/100;
 return <View style={{width:BASE_CARD_WIDTH*scale,height:(height+36)*scale,flexShrink:0}}>
 <Pressable accessibilityRole="button" accessibilityLabel={`${place}º puesto. ${player?.full_name??'Pendiente'}`} accessibilityState={{disabled:!player||!canOpen}} disabled={!player||!canOpen} onPress={onOpen} style={({pressed})=>[styles.card,{width:BASE_CARD_WIDTH,height,top:32*scale,transform:[{scale}]},pressed&&{opacity:0.8}]}>
  {place===1&&<MaterialCommunityIcons name="crown" size={32} color={shades[1]} style={styles.crown}/>}
  <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
   <Svg width="100%" height="100%" viewBox="0 0 180 320" preserveAspectRatio="none" aria-hidden fill="none">
    <Defs>
     <ClipPath id={id+'clip'}><Path d={silhouette}/></ClipPath>
     <LinearGradient id={id+'rim'} x1="0" y1="0" x2="1" y2="1"><Stop stopColor={shades[0]}/><Stop offset="0.24" stopColor={shades[2]}/><Stop offset="0.48" stopColor={shades[0]}/><Stop offset="0.72" stopColor={shades[1]}/><Stop offset="1" stopColor={shades[2]}/></LinearGradient>
     <LinearGradient id={id+'wash'} x1="0" y1="0" x2="1" y2="1"><Stop stopColor={shades[1]} stopOpacity={0.74*opacity}/><Stop offset="0.5" stopColor={shades[2]} stopOpacity={0.36*opacity}/><Stop offset="1" stopColor="#191A23"/></LinearGradient>
    </Defs>
    <Path d={silhouette} stroke="#000000" strokeWidth="7" strokeOpacity={0.3*shadow}/>
    <Path d={silhouette} stroke={shades[1]} strokeWidth="7" strokeOpacity="0.14"/>
    <Path d={silhouette} fill="#191A23" stroke={`url(#${id}rim)`} strokeWidth="1.8"/>
    <G clipPath={`url(#${id}clip)`}>
     <Path d="M0 0 H180 V320 H0 Z" fill={`url(#${id}wash)`}/>
     <Path d="M14 112 L125 25 L98 64 L165 34 L75 123 L156 80 L118 132 L20 182 Z" fill={shades[1]} opacity={0.1*opacity}/>
     <Path d="M18 108 L109 43 M25 124 L89 77 M22 145 L137 58 M20 252 L92 190 L78 278 L129 228 L152 287" stroke={shades[0]} strokeWidth="0.7" opacity={0.16*opacity}/>
     <Path d="M116 66 L139 24 L134 84 L160 64 L143 118 L112 148 L129 101 Z" fill={`url(#${id}rim)`} opacity={0.3*opacity}/>
     <Path d="M125 111 L164 80 L151 145 L125 165 L141 125 L112 154 Z" stroke={shades[0]} strokeWidth="1" opacity={0.3*opacity}/>
     <Path d="M16 216 H164 M76 291 H104" stroke={shades[1]} strokeWidth="0.8" opacity="0.5"/>
    </G>
    <Path d={silhouette} transform="translate(4 5) scale(0.955 0.968)" stroke={shades[1]} strokeWidth="0.8" opacity="0.8"/>
    <Path d="M3 52 V268 Q3 283 35 295 M177 52 V268 Q177 283 145 295" stroke={shades[0]} strokeWidth="0.7" opacity="0.6"/>
    <Path d="M125 45 L128 8 L133 5 L134 36 L142 23 L140 46 L128 69 Z M154 73 L164 36 L175 40 L169 58 L161 62 L154 92 L145 103 Z" fill={`url(#${id}rim)`} stroke={shades[2]} strokeWidth="0.6" opacity={0.7*opacity}/>
   </Svg>
  </View>
  <View style={[styles.placeBadge,{borderColor:shades[1],backgroundColor:shades[2]}]}><View style={[styles.placeBadgeInner,{borderColor:shades[0]+'80'}]}><Text maxFontSizeMultiplier={1} style={[styles.place,{color:shades[0]}]}>{place}</Text></View></View>
  <MaterialCommunityIcons pointerEvents="none" name="shield-star" size={235} color={shades[0]} style={styles.watermark}/>
  <View style={styles.photo}><ProfilePortrait key={player?.photo_url??player?.player_id??'empty'} url={player?.photo_url} name={player?.full_name??''} style={styles.portrait} alignTop/></View>
  <NameGradient colors={['transparent',shades[2]+'D9','#191A23']} locations={[0,0.6,1]} style={[styles.nameBand,{borderBottomColor:shades[1]}]}>
   <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} maxFontSizeMultiplier={1} style={styles.name}>{player?.full_name?.trim().split(/\s+/)[0]?.toLocaleUpperCase('es')||'Pendiente'}</Text>
  </NameGradient>
  <View style={styles.identity}><Text style={[styles.brand,{color:shades[0]}]}>ONCEX</Text><Text numberOfLines={1} style={styles.team}>{player?.team_name??'Sin jugador'}</Text><Text numberOfLines={1} style={[styles.position,{color:shades[0]}]}>{player?.player_position??''}</Text></View>
 </Pressable>
 </View>;
}
const styles=StyleSheet.create({
 card:{position:'absolute',left:0,transformOrigin:'top left'},
 crown:{position:'absolute',top:-30,alignSelf:'center'},
 placeBadge:{position:'absolute',zIndex:10,top:'7%',left:'10%',width:48,height:48,borderRadius:24,borderWidth:2,alignItems:'center',justifyContent:'center'},
 placeBadgeInner:{width:35,height:35,borderRadius:18,borderWidth:1,alignItems:'center',justifyContent:'center'},
 place:{fontSize:25,lineHeight:30,fontWeight:'900',textAlign:'center'},
 watermark:{position:'absolute',zIndex:1,top:'17%',alignSelf:'center',opacity:0.1},
 photo:{position:'absolute',zIndex:2,top:'20%',bottom:'25%',left:'4%',right:'4%',overflow:'hidden'},
 portrait:{width:'108%',height:'108%',marginLeft:'-4%',marginTop:'-2%',backgroundColor:'transparent'},
 nameBand:{position:'absolute',left:'7%',right:'7%',bottom:'24%',height:82,justifyContent:'flex-end',paddingHorizontal:6,paddingBottom:10,borderBottomWidth:1},
 name:{color:'#FFFFFF',fontSize:25,lineHeight:30,fontWeight:'900',letterSpacing:1.2,textAlign:'center'},
 identity:{position:'absolute',top:'78%',left:'9%',right:'9%',alignItems:'center',paddingTop:5},
 brand:{fontSize:10,fontWeight:'900',letterSpacing:2.5,marginBottom:5},
 team:{color:'#E0DBE4',fontSize:12,lineHeight:16,fontWeight:'600',textAlign:'center'},
 position:{fontSize:10,lineHeight:14,fontWeight:'700',textAlign:'center',marginTop:4},
});
