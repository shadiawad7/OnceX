import { textShadow } from '../theme/textShadow';
import { cardPosition, type OncexCardAssessment } from '../lib/oncexCard';
import OncexCardFrame from './OncexCardFrame';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import ProfilePhotoDisplay from './ProfilePhotoDisplay';
import { colors } from '../theme/colors';

type CardProps = { id: string; name: string; position: string; team?: string; category?: string; jersey: string; assessment: OncexCardAssessment };
export default function OncexCardPopup(player: CardProps) {
 const [visible,setVisible]=useState(false);
 const [cardWidth,setCardWidth]=useState(320);
 const scale=cardWidth/360;
 const assessment=player.assessment;
 return <>
  <Pressable accessibilityRole="button" accessibilityLabel="Ver ONCEX Card" onPress={()=>setVisible(true)} style={styles.launch}>
   <MaterialCommunityIcons name="cards-outline" size={28} color={colors.redBright}/><View style={styles.launchCopy}><Text style={styles.launchTitle}>ONCEX CARD</Text><Text style={styles.hint}>Tu tarjeta de rendimiento</Text></View><MaterialCommunityIcons name="arrow-right" size={26} color="#FFFFFF"/>
  </Pressable>
  <Modal visible={visible} transparent animationType="fade" onRequestClose={()=>setVisible(false)}>
   <View style={styles.backdrop}><View style={styles.sheet} accessibilityViewIsModal>
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar ONCEX Card" onPress={()=>setVisible(false)} style={styles.close}><MaterialCommunityIcons name="close" size={26} color="#FFFFFF"/></Pressable>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
     <View style={styles.card} onLayout={event=>setCardWidth(event.nativeEvent.layout.width)}>
      <View style={StyleSheet.absoluteFill}><OncexCardFrame/></View>
      <View style={styles.top}><Text maxFontSizeMultiplier={1} style={[styles.brand,{fontSize:24*scale}]}>ONCEX</Text><Text maxFontSizeMultiplier={1} style={[styles.edition,{fontSize:8*scale}]}>PLAYER CARD</Text></View>
      <View style={styles.playerRow}>
       <View style={styles.sidebar}>
        <View style={styles.score}><Text maxFontSizeMultiplier={1} adjustsFontSizeToFit numberOfLines={1} style={[styles.scoreValue,{fontSize:44*scale,lineHeight:52*scale}]}>{assessment.overall??0}</Text><Text maxFontSizeMultiplier={1} style={[styles.scoreLabel,{fontSize:7*scale}]}>ONCEX OVR</Text><View style={[styles.scoreRule,{marginVertical:10*scale}]}/><Text maxFontSizeMultiplier={1} adjustsFontSizeToFit numberOfLines={2} style={[styles.position,{fontSize:11*scale,lineHeight:14*scale}]}>{cardPosition(player.position)}</Text></View>
        <View style={styles.dorsal}><MaterialCommunityIcons name="tshirt-crew-outline" size={22*scale} color="#F4B5C1"/><Text maxFontSizeMultiplier={1} style={[styles.number,{fontSize:18*scale}]}>{player.jersey||'—'}</Text></View>
       </View>
       <View style={styles.portrait}>
        <ProfilePhotoDisplay id={player.id} name={player.name} style={styles.photo}/>
        <LinearGradient pointerEvents="none" colors={['transparent','#111217']} style={styles.photoFade}/>
        <LinearGradient pointerEvents="none" colors={['#19171E','transparent']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.photoLeft}/>
        <LinearGradient pointerEvents="none" colors={['transparent','#19171E']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.photoRight}/>
       </View>
      </View>
      <View style={styles.identity}><Text maxFontSizeMultiplier={1} numberOfLines={2} adjustsFontSizeToFit style={[styles.name,{fontSize:23*scale,lineHeight:26*scale}]}>{player.name||'Jugador'}</Text><Text maxFontSizeMultiplier={1} numberOfLines={2} style={[styles.team,{fontSize:10*scale,lineHeight:13*scale,marginTop:4*scale}]}>{[player.team,player.category].filter(Boolean).join(' · ')||'Equipo pendiente'}</Text></View>
      <View style={styles.attributes}>{assessment.attributes.map(attribute=><View key={attribute.code} accessibilityLabel={`${attribute.label}: ${attribute.value??0} de 99${assessment.source==='pending'?', pendiente de cálculo':''}`} style={styles.attribute}>
       <View style={styles.attributePlate}>
        <Text maxFontSizeMultiplier={1} numberOfLines={1} style={[styles.attributeLabel,{fontSize:10*scale}]}>{attribute.code}</Text>
        <Text maxFontSizeMultiplier={1} numberOfLines={1} style={[styles.attributeValue,{fontSize:24*scale,lineHeight:28*scale}]}>{attribute.value??0}</Text>
       </View>
      </View>)}</View>
     </View>
     <Text style={styles.demoNotice}>{assessment.source==='calculated'?('Valoración relativa de la temporada'+(assessment.reliability==null?'': ' · Fiabilidad '+Math.round(assessment.reliability*100)+'%')):'Sin valoración: faltan participación o jugadores comparables.'}</Text>
     <View style={styles.legend}>
      {assessment.attributes.map(attribute=><View key={attribute.code} style={styles.legendRow}><Text style={styles.legendCode}>{attribute.code}</Text><Text style={styles.legendLabel}>{attribute.label}</Text></View>)}
     </View>
    </ScrollView>
   </View></View>
  </Modal>
 </>;
}
const styles=StyleSheet.create({
 legend:{marginTop:12,paddingHorizontal:12,flexDirection:'row',flexWrap:'wrap',rowGap:12},legendRow:{width:'50%',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingHorizontal:5},legendCode:{color:'#FF91A7',fontSize:12,fontWeight:'900',letterSpacing:1},legendLabel:{flexShrink:1,color:'#E9E1E4',fontSize:13,textAlign:'center'},
 launch:{flexDirection:'row',alignItems:'center',gap:14,padding:18,borderRadius:20,borderWidth:1,borderColor:'#842234',backgroundColor:'rgba(30,12,18,0.65)',marginBottom:24},launchCopy:{flex:1},launchTitle:{color:'#FFFFFF',fontSize:16,fontWeight:'900',letterSpacing:1.5},hint:{color:'#DDD3D7',fontSize:12,marginTop:5},
 backdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.92)',alignItems:'center',justifyContent:'center',padding:16},sheet:{width:'100%',maxWidth:440,maxHeight:'95%'},close:{alignSelf:'flex-end',padding:12,minWidth:48,minHeight:48},scroll:{paddingHorizontal:4,paddingBottom:24},
 card:{width:'88%',maxWidth:310,aspectRatio:360/670,alignSelf:'center'},
 top:{position:'absolute',top:'8%',left:'20%',right:'20%',alignItems:'center'},brand:{color:'#FFFFFF',fontWeight:'900',fontStyle:'italic',letterSpacing:3},edition:{color:'#F594A5',fontWeight:'800',letterSpacing:1.5,marginTop:3},
 playerRow:{position:'absolute',top:'18%',left:'10%',right:'10%',height:'36%',flexDirection:'row',gap:8},sidebar:{width:'27%',justifyContent:'space-between',alignItems:'center',paddingVertical:8},portrait:{flex:1,overflow:'hidden'},photo:{width:'100%',height:'100%',borderRadius:0,marginVertical:0,backgroundColor:'transparent'},photoFade:{position:'absolute',left:0,right:0,bottom:0,height:'30%'},photoLeft:{position:'absolute',left:0,top:0,bottom:0,width:'18%'},photoRight:{position:'absolute',right:0,top:0,bottom:0,width:'18%'},
 score:{width:'100%',alignItems:'center'},scoreValue:{width:'100%',textAlign:'center',color:'#FFFFFF',fontWeight:'900',fontStyle:'italic',...textShadow('#000000',8,0,0)},scoreLabel:{color:'#FFD4DD',fontWeight:'900',letterSpacing:0.6},scoreRule:{height:2,width:'65%',backgroundColor:'#FA395C',marginVertical:12},position:{color:'#FFFFFF',fontWeight:'800',textAlign:'center'},
 dorsal:{alignItems:'center',gap:4},number:{color:'#FFFFFF',fontWeight:'900'},
 identity:{position:'absolute',top:'55%',left:'13%',right:'13%',height:'12%',alignItems:'center',justifyContent:'center'},name:{color:'#FFFFFF',fontWeight:'900',textAlign:'center'},team:{color:'#E1D9DC',textAlign:'center',marginTop:6},
 attributes:{position:'absolute',top:'67%',height:'20%',left:'16%',right:'16%',flexDirection:'row',flexWrap:'wrap',borderTopWidth:1,borderTopColor:'#813043',paddingTop:8},attribute:{width:'50%',height:'33.333333%',padding:3},attributePlate:{flex:1,width:'84%',alignSelf:'center',flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'rgba(255,145,164,0.22)',paddingHorizontal:4},attributeAccent:{position:'absolute',left:0,top:'25%',bottom:'25%',width:2,backgroundColor:'#FF4866'},attributeValue:{color:'#FFFFFF',fontWeight:'900',textAlign:'center'},attributeLabel:{color:'#E9CAD2',fontWeight:'700',letterSpacing:1.5,textAlign:'center'},pending:{position:'absolute',top:'91%',left:'12%',right:'12%',color:'#E3ABB6',textAlign:'center',letterSpacing:0.6},
 demoNotice:{color:'#F2B6C2',fontSize:10,lineHeight:16,fontWeight:'700',textAlign:'center',marginTop:10,paddingHorizontal:18}
});
