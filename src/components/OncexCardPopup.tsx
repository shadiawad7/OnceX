import ClubBadge from './ClubBadge';
import { textShadow } from '../theme/textShadow';
import { cardPosition, type OncexCardAssessment } from '../lib/oncexCard';
import OncexCardFrame from './OncexCardFrame';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import CardPlayerPortrait from './CardPlayerPortrait';

// Card-only palette: sporting data and shared application theme stay unchanged.
const cardPalette={red:'#350910',gold:'#E6C575',goldLight:'#F5D98F',goldMuted:'#B58A3C',ivory:'#F2E6C9'};

// Tamaños de los escudos: porcentaje del ancho total de la carta.
// Baja el valor para reducirlos; por ejemplo, 50 ocupa la mitad del ancho.
const CLUB_WATERMARK_SIZE_PERCENT = 90; // Escudo grande de fondo.
const CLUB_EMBLEM_SIZE_PERCENT = 17; // Escudo pequeño junto a la valoración.

type CardProps = { id: string; name: string; position: string; team?: string; category?: string; clubName?:string; clubPhotoUrl?:string; jersey: string; assessment: OncexCardAssessment };
export default function OncexCardPopup(player: CardProps) {
 const [visible,setVisible]=useState(false);
 const [cardWidth,setCardWidth]=useState(320);
 const scale=cardWidth/360;
 const detailScale=scale*0.9;
 const assessment=player.assessment;
 return <>
  <Pressable accessibilityRole="button" accessibilityLabel="Ver ONCEX Card" onPress={()=>setVisible(true)} style={styles.launch}>
   <MaterialCommunityIcons name="cards-outline" size={28} color={cardPalette.gold}/><View style={styles.launchCopy}><Text style={styles.launchTitle}>ONCEX CARD</Text><Text style={styles.hint}>Tu tarjeta de rendimiento</Text></View><MaterialCommunityIcons name="arrow-right" size={26} color={cardPalette.goldLight}/>
  </Pressable>
  <Modal visible={visible} transparent animationType="fade" onRequestClose={()=>setVisible(false)}>
   <View style={styles.backdrop}><View style={styles.sheet} accessibilityViewIsModal>
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar ONCEX Card" onPress={()=>setVisible(false)} style={styles.close}><MaterialCommunityIcons name="close" size={26} color={cardPalette.goldLight}/></Pressable>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
     <View style={styles.card} onLayout={event=>setCardWidth(event.nativeEvent.layout.width)}>
      <View style={StyleSheet.absoluteFill}><OncexCardFrame/></View>
      {player.clubPhotoUrl&&<View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.clubWatermark}><ClubBadge key={player.clubPhotoUrl} url={player.clubPhotoUrl} name={player.clubName} size={cardWidth*CLUB_WATERMARK_SIZE_PERCENT/100}/></View>}
      <View style={styles.top}><Text maxFontSizeMultiplier={1} style={[styles.brand,{fontSize:12*detailScale}]}>ONCEX</Text><Text maxFontSizeMultiplier={1} style={[styles.edition,{fontSize:7*detailScale}]}>PLAYER CARD</Text></View>
      <View style={styles.playerRow}>
       <View style={styles.sidebar}>
        <View style={styles.score}><Text maxFontSizeMultiplier={1} adjustsFontSizeToFit numberOfLines={1} style={[styles.scoreValue,{fontSize:76*detailScale,lineHeight:80*detailScale}]}>{assessment.overall??0}</Text><Text maxFontSizeMultiplier={1} style={[styles.position,{fontSize:27*detailScale,lineHeight:32*detailScale}]}>{cardPosition(player.position)}</Text><View style={styles.scoreRule}/></View>
        <View style={styles.clubEmblem}>{player.clubPhotoUrl?<ClubBadge key={player.clubPhotoUrl} url={player.clubPhotoUrl} name={player.clubName} size={cardWidth*CLUB_EMBLEM_SIZE_PERCENT/100}/>:<MaterialCommunityIcons name="shield-outline" size={cardWidth*CLUB_EMBLEM_SIZE_PERCENT/100} color={cardPalette.gold}/>}</View>
        <View style={styles.sidebarRule}/><View style={styles.dorsal}><MaterialCommunityIcons name="tshirt-crew-outline" size={22*detailScale} color={cardPalette.gold}/><Text maxFontSizeMultiplier={1} style={[styles.number,{fontSize:18*detailScale}]}>{player.jersey||'—'}</Text></View>
       </View>
       <View style={styles.portrait}>
        {visible&&<CardPlayerPortrait id={player.id} name={player.name}/>}
       </View>
      </View>
      <View style={styles.identity}><Text maxFontSizeMultiplier={1} numberOfLines={2} adjustsFontSizeToFit style={[styles.name,{fontSize:27*detailScale,lineHeight:30*detailScale}]}>{player.name||'Jugador'}</Text><Text maxFontSizeMultiplier={1} numberOfLines={2} style={[styles.team,{fontSize:10*detailScale,lineHeight:13*detailScale,marginTop:4*detailScale}]}>{[player.team,player.category].filter(Boolean).join(' · ')||'Equipo pendiente'}</Text></View>
      <View style={styles.attributes}>{assessment.attributes.map(attribute=><View key={attribute.code} accessibilityLabel={`${attribute.label}: ${attribute.value??0} de 99${assessment.source==='pending'?', pendiente de cálculo':''}`} style={styles.attribute}>
       <View style={styles.attributePlate}>
        <Text maxFontSizeMultiplier={1} numberOfLines={1} style={[styles.attributeValue,{fontSize:28*detailScale,lineHeight:32*detailScale}]}>{attribute.value??0}</Text>
        <Text maxFontSizeMultiplier={1} numberOfLines={1} style={[styles.attributeLabel,{fontSize:18*detailScale}]}>{attribute.code}</Text>
       </View>
      </View>)}</View>
      <Text maxFontSizeMultiplier={1} style={[styles.signature,{fontSize:8*detailScale}]}>ONCEX</Text>
     </View>
     {assessment.source!=='calculated' && <Text style={styles.demoNotice}>Sin valoración: faltan participación o jugadores comparables.</Text>}
     <View style={styles.legend}>
      {assessment.attributes.map(attribute=><View key={attribute.code} style={styles.legendRow}><Text style={styles.legendCode}>{attribute.code}</Text><Text style={styles.legendLabel}>{attribute.label}</Text></View>)}
     </View>
    </ScrollView>
   </View></View>
  </Modal>
 </>;
}
const styles=StyleSheet.create({
 launch:{flexDirection:'row',alignItems:'center',gap:14,padding:18,borderRadius:18,borderWidth:1,borderColor:cardPalette.goldMuted,backgroundColor:cardPalette.red,marginBottom:24},launchCopy:{flex:1},launchTitle:{color:cardPalette.goldLight,fontSize:16,fontWeight:'900',letterSpacing:1.5},hint:{color:cardPalette.ivory,fontSize:12,marginTop:5},
 backdrop:{flex:1,backgroundColor:'rgba(16,3,5,0.97)',alignItems:'center',justifyContent:'center',padding:16},sheet:{width:'100%',maxWidth:440,maxHeight:'95%'},close:{alignSelf:'flex-end',padding:12,minWidth:48,minHeight:48},scroll:{paddingHorizontal:4,paddingTop:28,paddingBottom:24},card:{width:'96%',maxWidth:350,aspectRatio:360/600,alignSelf:'center',overflow:'hidden',borderRadius:24},
 clubWatermark:{position:'absolute',top:'14%',height:'52%',left:'5%',right:'5%',opacity:0.10,pointerEvents:'none',alignItems:'center',justifyContent:'center'},
 top:{position:'absolute',top:'7%',left:'32%',right:'32%',alignItems:'center',gap:2},brand:{color:cardPalette.goldLight,fontWeight:'900',fontStyle:'italic',letterSpacing:3},edition:{color:cardPalette.goldMuted,fontWeight:'700',letterSpacing:1.3,textAlign:'center'},
 playerRow:{position:'absolute',top:'16%',left:'12%',right:'9%',height:'43%'},sidebar:{position:'absolute',left:0,top:0,bottom:0,width:'25%',zIndex:4,alignItems:'center',justifyContent:'flex-start',gap:8,paddingBottom:6},score:{width:'100%',alignItems:'center'},scoreValue:{width:'100%',textAlign:'center',color:cardPalette.goldLight,fontWeight:'500',letterSpacing:-2,...textShadow('rgba(0,0,0,0.22)',1,0,1)},position:{color:cardPalette.goldLight,fontWeight:'600',letterSpacing:1.5,textAlign:'center',...textShadow('rgba(0,0,0,0.4)',2,1,1)},scoreRule:{width:'80%',height:1,backgroundColor:'rgba(230,197,117,0.7)',marginTop:9},
 sidebarRule:{width:'80%',height:1,backgroundColor:'rgba(230,197,117,0.7)'},clubEmblem:{alignItems:'center',justifyContent:'center'},dorsal:{flexDirection:'row',alignItems:'center',gap:5},number:{color:cardPalette.goldLight,fontWeight:'800'},
 portrait:{position:'absolute',top:'-17%',bottom:'0%',left:'18%',right:'-7%',overflow:'hidden'},
 identity:{position:'absolute',top:'59%',left:'14%',right:'14%',height:'10%',justifyContent:'center',alignItems:'center'},name:{color:cardPalette.goldLight,fontWeight:'800',letterSpacing:1,textAlign:'center',...textShadow('rgba(16,3,5,0.8)',3,0,2)},team:{color:cardPalette.ivory,textAlign:'center'},
 attributes:{position:'absolute',top:'72%',height:'14%',left:'15%',right:'15%',flexDirection:'row',flexWrap:'wrap',columnGap:'10%'},attribute:{width:'45%',height:'33.333333%',justifyContent:'center'},attributePlate:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},attributeValue:{color:cardPalette.goldLight,fontWeight:'700',minWidth:34,textAlign:'right'},attributeLabel:{color:cardPalette.gold,fontWeight:'600',letterSpacing:1},signature:{position:'absolute',top:'90%',left:'38%',right:'38%',textAlign:'center',color:cardPalette.gold,fontWeight:'900',letterSpacing:2},
 legend:{marginTop:16,paddingHorizontal:12,flexDirection:'row',flexWrap:'wrap',rowGap:12},legendRow:{width:'50%',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingHorizontal:5},legendCode:{color:cardPalette.gold,fontSize:12,fontWeight:'900',letterSpacing:1},legendLabel:{flexShrink:1,color:cardPalette.ivory,fontSize:13,textAlign:'center'},demoNotice:{color:'#C5A8AD',fontSize:10,lineHeight:16,fontWeight:'600',textAlign:'center',marginTop:16,paddingHorizontal:18}
});
