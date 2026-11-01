import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Button from './Button';
import { loadMatchSummary, matchError, type MatchSummary } from '../lib/matches';
import { colors } from '../theme/colors';

const groups=[{field:'goals',label:'Goleadores',empty:'Sin goles registrados.'},{field:'assists',label:'Asistencias',empty:'Sin asistencias registradas.'},{field:'own_goals',label:'Goles en propia',empty:'Sin goles en propia.'},{field:'yellow_cards',label:'Tarjetas amarillas',empty:'Sin tarjetas amarillas.'},{field:'red_cards',label:'Tarjetas rojas',empty:'Sin tarjetas rojas.'}] as const;

export default function MatchReportPopup({matchId,teamId,onClose}:{matchId:string;teamId:string;onClose:()=>void}){
 const [summary,setSummary]=useState<MatchSummary|null>(null);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;
  void loadMatchSummary(matchId).then(data=>{
   if(data.match.team_id!==teamId)throw new Error('Este partido pertenece a otro equipo.');
   if(active)setSummary(data);
  }).catch(reason=>{if(active)setError(matchError(reason));});
  return()=>{active=false;};
 },[matchId,teamId,attempt]);
 function openPlayers(){onClose();router.push({pathname:'/teams/match-statistics',params:{teamId,matchId}});}
 return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.backdrop}><View style={styles.sheet} accessibilityViewIsModal>
  <View style={styles.header}><Text style={styles.title}>Resumen del partido</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar resumen" onPress={onClose} style={styles.close}><MaterialCommunityIcons name="close" size={24} color={colors.white}/></Pressable></View>
  <ScrollView contentContainerStyle={styles.content}>
   {!summary&&!error&&<ActivityIndicator color={colors.redBright}/>}
   {!!error&&<><Text accessibilityRole="alert" style={styles.empty}>{error}</Text><Button label="REINTENTAR" onPress={()=>{setError('');setAttempt(value=>value+1);}}/></>}
   {summary&&<>
    <Text style={styles.opponent}>vs {summary.match.opponent}</Text><Text style={styles.score}>{summary.match.goals_for??'—'} – {summary.match.goals_against??'—'}</Text>
    <Text style={styles.meta}>{summary.match.played_on.split('-').reverse().join('/')} · {summary.match.duration} min · {summary.match.venue==='away'?'Visitante':summary.match.venue==='home'?'Local':'Sede sin indicar'}</Text>
    <Text style={styles.note}>Eventos registrados de tu equipo. El acta no incluye el minuto de cada acción.</Text>
    {groups.map(group=>{
     const players=summary.players.filter(player=>player[group.field]>0);
     return <View key={group.field} style={styles.group}><Text style={styles.groupTitle}>{group.label}</Text>{players.length?players.map(player=><View key={player.slot_id} style={styles.event}><Text style={styles.name}>{player.player_name}</Text><Text style={styles.count}>{player[group.field]}</Text></View>):<Text style={styles.empty}>{group.empty}</Text>}</View>;
    })}
    <Button label="VER ESTADÍSTICAS DE JUGADORES" onPress={openPlayers}/>
    <Pressable accessibilityRole="button" onPress={()=>{onClose();router.push({pathname:'/teams/match',params:{teamId,matchId,edit:'1'}});}} style={styles.edit}><Text style={styles.editText}>Revisar o corregir el acta</Text></Pressable>
   </>}
  </ScrollView>
 </View></View></Modal>;
}
const styles=StyleSheet.create({backdrop:{flex:1,justifyContent:'center',padding:18,backgroundColor:'rgba(0,0,0,0.82)'},sheet:{width:'100%',maxWidth:480,maxHeight:'88%',alignSelf:'center',borderRadius:24,borderWidth:1,borderColor:'#652036',backgroundColor:'#110D12',overflow:'hidden'},header:{flexDirection:'row',alignItems:'center',paddingLeft:18,paddingRight:8,borderBottomWidth:1,borderColor:'#38212D'},title:{flex:1,fontSize:19,fontWeight:'900',color:colors.white},close:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'},content:{padding:18,paddingBottom:24},opponent:{color:colors.white,fontSize:20,fontWeight:'800',textAlign:'center'},score:{color:colors.white,fontSize:44,fontWeight:'900',textAlign:'center',marginVertical:8},meta:{color:'#C5ADB9',fontSize:12,textAlign:'center'},note:{color:'#AA929F',fontSize:11,lineHeight:17,marginTop:16,marginBottom:4},group:{marginTop:18},groupTitle:{fontSize:14,fontWeight:'800',color:colors.white,marginBottom:8},event:{flexDirection:'row',alignItems:'center',gap:12,padding:12,backgroundColor:'#21131C',borderRadius:10,marginBottom:6},name:{flex:1,color:colors.white,fontSize:14},count:{color:'#FF8BA0',fontSize:17,fontWeight:'900'},empty:{fontSize:12,lineHeight:19,color:'#B7A3AF'},edit:{minHeight:48,alignItems:'center',justifyContent:'center',marginTop:8},editText:{color:'#D9BAC8',fontWeight:'700',fontSize:12}});
