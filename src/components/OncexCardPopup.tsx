import ClubBadge from './ClubBadge';
import { cardPosition, type OncexCardAssessment } from '../lib/oncexCard';
import OncexCardFrame from './OncexCardFrame';
import OncexCardAura from './OncexCardAura';
import { useId, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import CardPlayerPortrait from './CardPlayerPortrait';

// Tamaño de toda la carta, manteniendo las proporciones y el límite de la pantalla.
const CARD_SIZE_PERCENT=90;
// Escudo como porcentaje del ancho de la carta.
const CLUB_EMBLEM_SIZE_PERCENT=20;
// Tamaño del número del dorsal: 100 = normal.
const JERSEY_NUMBER_SIZE_PERCENT=100;
type CardProps={id:string;name:string;position:string;team?:string;category?:string;clubName?:string;clubPhotoUrl?:string;jersey:string;assessment:OncexCardAssessment};
export default function OncexCardPopup(player:CardProps){
 const bannerId=useId().replace(/:/g,'')+'banner';
 const [visible,setVisible]=useState(false);
 const [cardArea,setCardArea]=useState({width:330,height:500});
 const displayWidth=Math.max(1,Math.min(cardArea.width,cardArea.height*360/610*Math.min(1,CARD_SIZE_PERCENT/100),350*Math.max(1,CARD_SIZE_PERCENT)/100));
 const assessment=player.assessment;
 const position=cardPosition(player.position);
 return <>
  <Pressable accessibilityRole="button" accessibilityLabel="Ver ONCEX Card" onPress={()=>setVisible(true)} style={styles.launch}>
   <MaterialCommunityIcons name="cards-outline" size={28} color="#FFE199"/><View style={styles.launchCopy}><Text style={styles.launchTitle}>ONCEX CARD</Text><Text style={styles.hint}>Tu tarjeta de rendimiento</Text></View><MaterialCommunityIcons name="arrow-right" size={26} color="#FFF"/>
  </Pressable>
  <Modal visible={visible} transparent animationType="fade" onRequestClose={()=>setVisible(false)}>
   <View style={styles.backdrop}>
    <Image source={require('../../assets/login-stadium.png')} resizeMode="cover" style={[StyleSheet.absoluteFill,styles.stadium]} accessibilityIgnoresInvertColors/>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}><OncexCardAura/></View>
    <SafeAreaView style={styles.sheet} accessibilityViewIsModal>
     <View style={styles.header}>
      <Image source={require('../../assets/oncex-logo.png')} resizeMode="contain" style={styles.logo} accessibilityLabel="ONCEX"/>
      <Text style={styles.headerCaption}>PLAYER CARD</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar ONCEX Card" onPress={()=>setVisible(false)} style={styles.close}><MaterialCommunityIcons name="close" size={30} color="#FFF"/></Pressable>
     </View>
     <View style={styles.content}>
      <View style={styles.cardArea} onLayout={event=>{const {width,height}=event.nativeEvent.layout;setCardArea({width,height});}}>
      <View style={[styles.cardSize,{width:displayWidth,height:displayWidth*610/360}]}>
       <View style={[styles.card,{transform:[{scale:displayWidth/360}]}]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}><OncexCardFrame/></View>
        <View style={styles.portrait}>{visible&&<CardPlayerPortrait id={player.id} name={player.name}/>}</View>
        <View style={styles.score}>
         <Text maxFontSizeMultiplier={1} adjustsFontSizeToFit numberOfLines={1} style={styles.scoreValue}>{assessment.overall??0}</Text>
         <View style={styles.positionPill}><Text maxFontSizeMultiplier={1} style={styles.position}>{position==='MED'?'MC':position}</Text></View>
        </View>
        <View style={styles.clubEmblem}>{player.clubPhotoUrl?<ClubBadge url={player.clubPhotoUrl} name={player.clubName} size={360*CLUB_EMBLEM_SIZE_PERCENT/100}/>:<MaterialCommunityIcons name="shield-outline" size={360*CLUB_EMBLEM_SIZE_PERCENT/100} color="#FFE199"/>}</View>
        <Text accessibilityLabel={`Dorsal ${player.jersey||'sin asignar'}`} maxFontSizeMultiplier={1} style={[styles.number,{fontSize:30*JERSEY_NUMBER_SIZE_PERCENT/100}]}>{player.jersey||'—'}</Text>
        <Svg pointerEvents="none" width={312} height={91} viewBox="0 0 320 91" preserveAspectRatio="none" style={styles.identityBackground}>
          <Defs>
           <LinearGradient id={bannerId} x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#08080A" stopOpacity="0"/><Stop offset="0.18" stopColor="#08080A" stopOpacity="0.8"/><Stop offset="0.5" stopColor="#08080A" stopOpacity="0.97"/><Stop offset="1" stopColor="#08080A" stopOpacity="0.85"/></LinearGradient>
           <LinearGradient id={bannerId+'edge'} x1="0" y1="0" x2="1" y2="0"><Stop stopColor="#D7A94C" stopOpacity="0"/><Stop offset="0.2" stopColor="#FFE4A1"/><Stop offset="0.8" stopColor="#FFE4A1"/><Stop offset="1" stopColor="#D7A94C" stopOpacity="0"/></LinearGradient>
          </Defs>
          <Path d="M0 0 H320 V75 Q160 99 0 75 Z" fill={`url(#${bannerId})`}/>
          <Path d="M0 14 Q160 -4 320 14" stroke={`url(#${bannerId}edge)`} strokeWidth="0.9"/>
          <Path d="M0 75 Q160 99 320 75" stroke="#F62B1F" strokeOpacity="0.8" strokeWidth="0.8"/>
        </Svg>
        <View style={styles.identity}>
         <Text maxFontSizeMultiplier={1} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={styles.name}>{player.name||'Jugador'}</Text>
         <View style={styles.identityRule}/>
         <Text maxFontSizeMultiplier={1} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.team}>{[player.team,player.category].filter(Boolean).join(' · ')||player.clubName||'ONCEX PLAYER'}</Text>
        </View>
        <View style={styles.attributes}>{[assessment.attributes.slice(0,3),assessment.attributes.slice(3,6)].map((column,index)=><View key={index} style={styles.attributeColumn}>{column.map(attribute=><View key={attribute.code} accessibilityLabel={`${attribute.label}: ${attribute.value??0} de 99${assessment.source==='pending'?', pendiente de cálculo':''}`} style={styles.attribute}>
         <Text maxFontSizeMultiplier={1} style={styles.attributeValue}>{attribute.value??0}</Text><Text maxFontSizeMultiplier={1} style={styles.attributeLabel}>{attribute.code}</Text>
        </View>)}</View>)}</View>
        <View pointerEvents="none" style={styles.ball}><MaterialCommunityIcons name="soccer" size={23} color="#FFD66A"/></View>
       </View>
      </View>
      </View>
      {assessment.source!=='calculated'&&<Text style={styles.demoNotice}>Sin valoración: faltan participación o jugadores comparables.</Text>}
      <View style={styles.legend}>{assessment.attributes.map(attribute=><View key={attribute.code} style={styles.legendRow}><View style={styles.legendBadge}><Text maxFontSizeMultiplier={1} style={styles.legendCode}>{attribute.code}</Text></View><Text maxFontSizeMultiplier={1} style={styles.legendLabel}>{attribute.label}</Text></View>)}</View>
     </View>
    </SafeAreaView>
   </View>
  </Modal>
 </>;
}
const styles=StyleSheet.create({
 launch:{flexDirection:'row',alignItems:'center',gap:14,padding:18,borderRadius:18,borderWidth:1,borderColor:'#DA2432',backgroundColor:'#23070D',marginBottom:24},launchCopy:{flex:1},launchTitle:{color:'#FFF',fontSize:16,fontWeight:'900',letterSpacing:1.5},hint:{color:'#D3BABE',fontSize:12,marginTop:5},
 backdrop:{flex:1,backgroundColor:'#05070B'},stadium:{opacity:0.2,width:'100%',height:'100%'},sheet:{flex:1,width:'100%',maxWidth:480,alignSelf:'center'},header:{alignItems:'center',paddingTop:2,paddingBottom:6},logo:{width:145,height:64},headerCaption:{color:'#FFF',fontSize:11,fontWeight:'700',fontStyle:'italic',letterSpacing:6,marginTop:0},close:{position:'absolute',right:8,top:8,minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'},content:{flex:1,minHeight:0,paddingHorizontal:16,paddingBottom:8},cardArea:{flex:1,minHeight:0,alignItems:'center',justifyContent:'center'},
 cardSize:{alignSelf:'center',flexShrink:0},card:{position:'absolute',top:0,left:0,width:360,height:610,transformOrigin:'top left'},portrait:{position:'absolute',top:61,bottom:208,left:76,right:20,overflow:'hidden'},score:{position:'absolute',top:64,left:38,width:78,alignItems:'center'},scoreValue:{width:'100%',fontSize:63,lineHeight:78,fontWeight:'800',fontStyle:'italic',letterSpacing:-3,color:'#FFE199',textAlign:'center'},positionPill:{borderWidth:1.5,borderColor:'#FF2424',borderRadius:8,backgroundColor:'#10080A',paddingHorizontal:10,shadowColor:'#FF1818',shadowOpacity:0.85,shadowRadius:7,shadowOffset:{width:0,height:0}},position:{color:'#FFF',fontSize:24,lineHeight:29,fontWeight:'800',fontStyle:'italic'},clubEmblem:{position:'absolute',top:197,left:38,width:78,alignItems:'center'},number:{position:'absolute',top:266,left:38,width:78,textAlign:'center',color:'#FFF',fontStyle:'italic',fontWeight:'800',lineHeight:40},
 identityBackground:{position:'absolute',top:326,left:24},identity:{position:'absolute',top:326,left:24,right:24,height:91,alignItems:'center',paddingTop:11,paddingHorizontal:18},name:{width:'100%',fontSize:34,lineHeight:41,color:'#FFF',fontWeight:'900',fontStyle:'italic',textTransform:'uppercase',textAlign:'center'},identityRule:{height:0.7,backgroundColor:'#C29748',width:'92%',marginTop:2,marginBottom:4},team:{width:'100%',fontSize:10,lineHeight:16,color:'#ECE7E2',fontStyle:'italic',textAlign:'center'},
 attributes:{position:'absolute',top:421,left:53,right:53,height:108,flexDirection:'row',justifyContent:'space-between'},attributeColumn:{width:108},attribute:{height:36,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},attributeValue:{minWidth:38,fontSize:28,lineHeight:34,fontWeight:'800',fontStyle:'italic',textAlign:'right',color:'#FFE199'},attributeLabel:{fontSize:18,lineHeight:26,color:'#EEE',fontStyle:'italic',letterSpacing:1},ball:{position:'absolute',top:454,left:168,width:24,height:25,backgroundColor:'#170706',alignItems:'center',justifyContent:'center',borderRadius:12},
 legend:{marginTop:8,marginHorizontal:4,paddingVertical:10,paddingHorizontal:10,borderWidth:1,borderColor:'#BB9651',borderRadius:12,backgroundColor:'rgba(7,8,11,0.9)',flexDirection:'row',flexWrap:'wrap',rowGap:8},legendRow:{width:'50%',flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:3},legendBadge:{backgroundColor:'#940909',borderColor:'#E3362C',borderWidth:0.7,borderRadius:5,paddingHorizontal:7,paddingVertical:2,minWidth:38},legendCode:{color:'#FFF',fontSize:12,fontStyle:'italic',fontWeight:'900',textAlign:'center'},legendLabel:{flexShrink:1,color:'#E9E5E3',fontSize:12,fontStyle:'italic'},demoNotice:{color:'#C5A8AD',fontSize:10,lineHeight:16,textAlign:'center',marginTop:12,paddingHorizontal:18}
});
