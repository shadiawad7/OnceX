import ClubBadge from './ClubBadge';
import { textShadow } from '../theme/textShadow';
import { cardPosition, type OncexCardAssessment } from '../lib/oncexCard';
import OncexCardFrame from './OncexCardFrame';
import OncexCardAura from './OncexCardAura';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import CardPlayerPortrait from './CardPlayerPortrait';

// Card-only palette: sporting data and shared application theme stay unchanged.
const cardPalette={surface:'#23070D',platinumHighlight:'#FFFFFF',accent:'#FFFFFF',platinum:'#E4E7EB',platinumLight:'#FFFFFF',platinumMuted:'#FF2438',secondary:'#D3BABE'};

// Tamaño de TODA la carta: 100 = actual; 80 = más pequeña; 110 = más grande.
// Se adapta al ancho disponible de la pantalla sin deformarse.
const CARD_SIZE_PERCENT = 100;

// Tamaño del escudo: porcentaje del ancho total de la carta.
// Baja el valor para reducirlo; por ejemplo, 10 ocupa el 10 % del ancho.
const CLUB_EMBLEM_SIZE_PERCENT = 17; // Escudo pequeño junto a la valoración.

type CardProps = { id: string; name: string; position: string; team?: string; category?: string; clubName?:string; clubPhotoUrl?:string; jersey: string; assessment: OncexCardAssessment };
export default function OncexCardPopup(player: CardProps) {
 const [visible,setVisible]=useState(false);
 const [cardWidth,setCardWidth]=useState(350);
 const [displayWidth,setDisplayWidth]=useState(320);
 const cardSize=Math.max(1,CARD_SIZE_PERCENT)/115;
 const scale=cardWidth/360;
 const detailScale=scale*0.9;
 const assessment=player.assessment;
 return <>
  <Pressable accessibilityRole="button" accessibilityLabel="Ver ONCEX Card" onPress={()=>setVisible(true)} style={styles.launch}>
   <MaterialCommunityIcons name="cards-outline" size={28} color={cardPalette.platinum}/><View style={styles.launchCopy}><Text style={styles.launchTitle}>ONCEX CARD</Text><Text style={styles.hint}>Tu tarjeta de rendimiento</Text></View><MaterialCommunityIcons name="arrow-right" size={26} color={cardPalette.platinumLight}/>
  </Pressable>
  <Modal visible={visible} transparent animationType="fade" onRequestClose={()=>setVisible(false)}>
   <View style={styles.backdrop}>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}><OncexCardAura/></View>
    <View style={styles.sheet} accessibilityViewIsModal>
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar ONCEX Card" onPress={()=>setVisible(false)} style={styles.close}><MaterialCommunityIcons name="close" size={26} color={cardPalette.platinumLight}/></Pressable>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
     <View style={[styles.cardSize,{maxWidth:350*cardSize}]} onLayout={event=>setDisplayWidth(event.nativeEvent.layout.width)}>
     <View style={[styles.card,{transform:[{scale:displayWidth/350}]}]} onLayout={event=>setCardWidth(event.nativeEvent.layout.width)}>
      <View style={StyleSheet.absoluteFill}><OncexCardFrame/></View>
      <View style={styles.playerRow}>
       <View style={styles.sidebar}>
        <View style={styles.score}><Text maxFontSizeMultiplier={1} adjustsFontSizeToFit numberOfLines={1} style={[styles.scoreValue,{fontSize:76*detailScale,lineHeight:80*detailScale}]}>{assessment.overall??0}</Text><Text maxFontSizeMultiplier={1} style={[styles.position,{fontSize:27*detailScale,lineHeight:32*detailScale}]}>{cardPosition(player.position)}</Text><View style={styles.scoreRule}/></View>
        <View style={styles.clubEmblem}>{player.clubPhotoUrl?<ClubBadge key={player.clubPhotoUrl} url={player.clubPhotoUrl} name={player.clubName} size={cardWidth*CLUB_EMBLEM_SIZE_PERCENT/100}/>:<MaterialCommunityIcons name="shield-outline" size={cardWidth*CLUB_EMBLEM_SIZE_PERCENT/100} color={cardPalette.platinum}/>}</View>

       </View>
       <View style={styles.portrait}>
        {visible&&<CardPlayerPortrait id={player.id} name={player.name}/>}
       </View>
      </View>
      <View style={styles.identity}><Text maxFontSizeMultiplier={1} numberOfLines={2} adjustsFontSizeToFit style={[styles.name,{fontSize:32*detailScale,lineHeight:35*detailScale}]}>{player.name||'Jugador'}</Text><Text maxFontSizeMultiplier={1} numberOfLines={2} style={[styles.team,{fontSize:10*detailScale,lineHeight:13*detailScale,marginTop:4*detailScale}]}>{[player.team,player.category].filter(Boolean).join(' · ')||'Equipo pendiente'}</Text></View>
      <View style={styles.attributes}>{assessment.attributes.map(attribute=><View key={attribute.code} accessibilityLabel={`${attribute.label}: ${attribute.value??0} de 99${assessment.source==='pending'?', pendiente de cálculo':''}`} style={styles.attribute}>
       <View style={styles.attributePlate}>
        <Text maxFontSizeMultiplier={1} numberOfLines={1} style={[styles.attributeValue,{fontSize:28*detailScale,lineHeight:32*detailScale}]}>{attribute.value??0}</Text>
        <Text maxFontSizeMultiplier={1} numberOfLines={1} style={[styles.attributeLabel,{fontSize:18*detailScale}]}>{attribute.code}</Text>
       </View>
      </View>)}</View>
      <View accessibilityLabel={`Dorsal ${player.jersey||'sin asignar'}`} style={styles.dorsal}><MaterialCommunityIcons name="tshirt-crew-outline" size={17*detailScale} color={cardPalette.platinum}/><Text maxFontSizeMultiplier={1} style={[styles.number,{fontSize:18*detailScale}]}>{player.jersey||'—'}</Text></View>
     </View>
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
 launch:{flexDirection:'row',alignItems:'center',gap:14,padding:18,borderRadius:18,borderWidth:1,borderColor:cardPalette.platinumMuted,backgroundColor:cardPalette.surface,marginBottom:24},launchCopy:{flex:1},launchTitle:{color:cardPalette.platinumLight,fontSize:16,fontWeight:'900',letterSpacing:1.5},hint:{color:cardPalette.secondary,fontSize:12,marginTop:5},
 backdrop:{flex:1,backgroundColor:'rgba(16,3,5,0.97)',alignItems:'center',justifyContent:'center',padding:16},sheet:{width:'100%',maxWidth:440,maxHeight:'95%'},close:{alignSelf:'flex-end',padding:12,minWidth:48,minHeight:48},scroll:{paddingHorizontal:4,paddingTop:70,paddingBottom:20},cardSize:{width:'96%',aspectRatio:360/600,alignSelf:'center'},card:{position:'absolute',top:0,left:0,width:350,aspectRatio:360/600,transformOrigin:'top left',overflow:'hidden',borderRadius:24},
 playerRow:{position:'absolute',top:'12%',left:'12%',right:'9%',height:'53%'},sidebar:{position:'absolute',left:0,top:0,bottom:0,width:'25%',zIndex:4,alignItems:'center',justifyContent:'flex-start',gap:8,paddingBottom:6},score:{width:'100%',alignItems:'center'},scoreValue:{width:'100%',textAlign:'center',color:cardPalette.accent,fontWeight:'500',letterSpacing:-1.5,...textShadow('rgba(12,3,5,0.75)',3,0,2)},position:{color:cardPalette.accent,fontWeight:'700',letterSpacing:1.5,textAlign:'center',...textShadow('rgba(12,3,5,0.75)',2,0,1)},scoreRule:{width:'80%',height:1,backgroundColor:'rgba(255,36,56,0.65)',marginTop:9},
 clubEmblem:{alignItems:'center',justifyContent:'center'},dorsal:{position:'absolute',top:'52%',left:'12%',right:'68%',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},number:{color:cardPalette.platinumLight,fontWeight:'800'},
 portrait:{position:'absolute',top:'-5%',bottom:'-2%',left:'20%',right:'-7%',overflow:'hidden'},
 identity:{position:'absolute',top:'59%',left:'14%',right:'14%',height:'9%',justifyContent:'center',alignItems:'center'},name:{color:cardPalette.accent,fontWeight:'700',textTransform:'uppercase',letterSpacing:0.5,textAlign:'center',...textShadow('rgba(16,3,5,0.8)',3,0,2)},team:{color:cardPalette.secondary,textAlign:'center'},
 attributes:{position:'absolute',top:'70%',height:'18%',left:'15%',right:'15%',flexDirection:'column',flexWrap:'wrap',columnGap:'10%'},attribute:{width:'45%',height:'33.333333%',justifyContent:'center'},attributePlate:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},attributeValue:{color:cardPalette.accent,fontWeight:'600',minWidth:34,textAlign:'right',...textShadow('rgba(12,3,5,0.75)',2,0,1)},attributeLabel:{color:cardPalette.accent,fontWeight:'500',letterSpacing:1},
 legend:{marginTop:-40,paddingHorizontal:12,flexDirection:'row',flexWrap:'wrap',rowGap:12},legendRow:{width:'50%',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingHorizontal:5},legendCode:{color:cardPalette.platinum,fontSize:12,fontWeight:'900',letterSpacing:1},legendLabel:{flexShrink:1,color:cardPalette.secondary,fontSize:13,textAlign:'center'},demoNotice:{color:'#C5A8AD',fontSize:10,lineHeight:16,fontWeight:'600',textAlign:'center',marginTop:16,paddingHorizontal:18}
});
