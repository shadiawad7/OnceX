import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import AccountShell from '../../components/AccountShell';
import Button from '../../components/Button';
import PersonAvatar from '../../components/PersonAvatar';
import { loadMatchSummary, matchError, pointBreakdownLabel, type MatchSummary } from '../../lib/matches';
import { colors } from '../../theme/colors';

export default function MatchStatisticsPage(){
 const {teamId,matchId}=useLocalSearchParams<{teamId:string;matchId:string}>();
 return <AccountShell allowed={['coach','club_admin','super_admin']} fallback={{pathname:'/teams/[id]',params:{id:teamId,section:'matches'}}}>{()=> <MatchStatistics key={`${teamId}-${matchId}`} teamId={teamId} matchId={matchId}/>}</AccountShell>;
}
function MatchStatistics({teamId,matchId}:{teamId:string;matchId:string}){
 const [summary,setSummary]=useState<MatchSummary|null>(null);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 useFocusEffect(useCallback(()=>{
  let active=true;
  void loadMatchSummary(matchId).then(data=>{
   if(data.match.team_id!==teamId)throw new Error('Este partido pertenece a otro equipo.');
   if(active){setSummary(data);setError('');}
  }).catch(reason=>{if(active)setError(matchError(reason));});
  return()=>{active=false;};
 // Retry intentionally starts a new scoped request.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[matchId,teamId,attempt]));
 return <FlatList data={summary?.players??[]} keyExtractor={player=>player.slot_id} contentContainerStyle={styles.content} ListHeaderComponent={<>
  <Text style={styles.title}>Estadísticas del partido</Text>
  {summary&&<><Text style={styles.match}>vs {summary.match.opponent} · {summary.match.goals_for??'—'} – {summary.match.goals_against??'—'}</Text><Text style={styles.hint}>{summary.match.played_on.split('-').reverse().join('/')} · {summary.match.status==='confirmed'?'Resultados oficiales':'Borrador: estadísticas provisionales'}</Text></>}
  {!summary&&!error&&<ActivityIndicator color={colors.redBright}/>}
  {!!error&&<><Text accessibilityRole="alert" style={styles.hint}>{error}</Text><Button label="REINTENTAR" onPress={()=>{setError('');setAttempt(value=>value+1);}}/></>}
 </>} ListEmptyComponent={summary&&!error?<Text style={styles.hint}>No hay actuaciones registradas.</Text>:undefined} renderItem={({item:player})=><View style={styles.player}>
  <View style={styles.identity}><PersonAvatar key={player.photoUrl??player.slot_id} url={player.photoUrl} name={player.player_name}/><View style={styles.copy}><Text style={styles.name}>{player.player_name}</Text><Text style={styles.position}>{player.player_position} · {player.starter?'Titular':'Suplente'}</Text></View></View>
  <View style={styles.metrics}>{[
   ['Minutos',player.minutes??'—'],['Goles',player.goals],['Asistencias',player.assists],['Goles en propia',player.own_goals],['Amarillas',player.yellow_cards],['Rojas',player.red_cards],['Goles encajados en juego',player.conceded_while_playing??'—'],['Portería a cero',player.clean_sheet===null?'—':player.clean_sheet?'Sí':'No'],['Puntos ONCEX',player.oncex_points??'—'],
  ].map(([label,value])=><View key={label} style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}</View>
  <Text style={styles.breakdown}>{pointBreakdownLabel(player)}</Text>
 </View>} ListFooterComponent={summary?<Button secondary label="VOLVER A PARTIDOS" onPress={()=>{if(router.canGoBack())router.back();else router.replace({pathname:'/teams/[id]',params:{id:teamId,section:'matches'}});}}/>:undefined}/>;
}
const styles=StyleSheet.create({content:{padding:20,paddingBottom:40},title:{fontSize:25,fontWeight:'900',color:colors.white},match:{fontSize:18,fontWeight:'800',color:colors.white,marginTop:14},hint:{color:'#BBA8B4',fontSize:12,lineHeight:20,marginVertical:12},player:{padding:16,borderRadius:18,borderWidth:1,borderColor:'#482233',backgroundColor:'#151015',marginTop:18},identity:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:16},copy:{flex:1},name:{color:colors.white,fontWeight:'800',fontSize:17},position:{color:'#B7A5B1',fontSize:12,marginTop:5},metrics:{gap:0},metric:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:10,borderBottomWidth:1,borderColor:'#30202B'},metricLabel:{flex:1,color:'#D9CBD4',fontSize:13},value:{color:colors.white,fontSize:17,fontWeight:'800'},breakdown:{color:'#BB8F9F',fontSize:11,lineHeight:18,marginTop:14}});
