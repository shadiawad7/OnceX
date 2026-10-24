import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AccountShell from '../../components/AccountShell';
import ClubBadge from '../../components/ClubBadge';
import PersonAvatar from '../../components/PersonAvatar';
import { clubPhotoUrls } from '../../lib/clubPhotos';
import { client } from '../../lib/client';
import { loadTeamMatches, loadMatchSummary, matchError, type MatchPlayer, type TeamMatch } from '../../lib/matches';
import { colors } from '../../theme/colors';

const summaryActions=[
 {key:'goals',label:'Gol',plural:'Goles',icon:'soccer',color:'#FFFFFF'},
 {key:'own_goals',label:'Gol en propia',plural:'Goles en propia',icon:'soccer',color:'#FF647C'},
 {key:'assists',label:'Asistencia',plural:'Asistencias',icon:'shoe-cleat',color:'#54D7E5'},
 {key:'yellow_cards',label:'Tarjeta amarilla',plural:'Tarjetas amarillas',icon:'card',color:'#FFD43B'},
 {key:'red_cards',label:'Tarjeta roja',plural:'Tarjetas rojas',icon:'card',color:'#FF465D'},
] as const;
type MatchTeam={id:string;name:string;clubs:{name:string;photo_path:string|null}|null;photoUrl?:string};
const tones={win:{accent:'#359A65',glow:'rgba(53,154,101,0.25)',label:'Victoria'},draw:{accent:'#929AA5',glow:'rgba(146,154,165,0.2)',label:'Empate'},loss:{accent:'#D85567',glow:'rgba(216,85,103,0.23)',label:'Derrota'}};
export default function PlayerMatches(){return <AccountShell allowed={['player']}>{account=><PlayerMatchesContent userId={account.userId}/>}</AccountShell>;}
function PlayerMatchesContent({userId}:{userId:string}){
 const [teams,setTeams]=useState<MatchTeam[]>([]),[teamId,setTeamId]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const team=teams.find(item=>item.id===teamId)??teams[0];
 useFocusEffect(useCallback(()=>{let active=true;setLoading(true);void(async()=>{
  const result=await client().from('team_members').select('teams(id,name,clubs(name,photo_path))').eq('user_id',userId).eq('role_code','player').order('team_id');
  if(result.error)throw result.error;
  const records=(result.data as unknown as {teams:MatchTeam|null}[]).flatMap(row=>row.teams?[row.teams]:[]);
  const urls=await clubPhotoUrls(records.flatMap(item=>item.clubs?.photo_path?[item.clubs.photo_path]:[]));
  if(active){setTeams(records.map(item=>({...item,photoUrl:urls.get(item.clubs?.photo_path??'')})));setError('');}
 })().catch(reason=>{if(active)setError(matchError(reason));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[userId]));
 return <ScrollView contentContainerStyle={styles.content}><Text style={styles.eyebrow}>CENTRO DE PARTIDOS</Text><Text style={styles.title}>Partidos</Text><Text style={styles.subtitle}>Resultados y actuaciones del equipo</Text>
  {loading&&<ActivityIndicator color={colors.red}/>}{!!error&&<Text accessibilityRole="alert" style={styles.message}>{error}</Text>}
  {teams.length>1&&<View style={styles.teamChoices}>{teams.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:item.id===team?.id}} onPress={()=>setTeamId(item.id)} style={[styles.teamChoice,item.id===team?.id&&styles.teamChoiceSelected]}><Text style={styles.teamChoiceText}>{item.name}</Text></Pressable>)}</View>}
  {!loading&&!error&&(team?<MatchHistory key={team.id} team={team}/>:<Text style={styles.message}>Todavía no tienes un equipo asignado.</Text>)}
 </ScrollView>;
}
function MatchHistory({team}:{team:MatchTeam}){
 const [matches,setMatches]=useState<TeamMatch[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useFocusEffect(useCallback(()=>{let active=true;setLoading(true);void loadTeamMatches(team.id).then(data=>{if(active){setMatches(data.filter(match=>match.status==='confirmed'));setError('');}}).catch(reason=>{if(active)setError(matchError(reason));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[team.id]));
 return <>{loading&&<ActivityIndicator color={colors.red}/>}{!!error&&<Text accessibilityRole="alert" style={styles.message}>{error}</Text>}{!loading&&!error&&!matches.length&&<Text style={styles.message}>Todavía no hay partidos confirmados. Aparecerán cuando el entrenador registre la alineación y las actuaciones.</Text>}{matches.map(match=><MatchCard key={match.id} match={match} team={team}/>)}</>;
}
function MatchCard({match,team}:{match:TeamMatch;team:MatchTeam}){
 const [open,setOpen]=useState(false),[players,setPlayers]=useState<MatchPlayer[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const tone=(match.goals_for??0)>(match.goals_against??0)?'win':match.goals_for===match.goals_against?'draw':'loss';
 const palette=tones[tone];
 const actions=summaryActions.flatMap(action=>players.filter(player=>player[action.key]>0).map(player=>({player,action,count:player[action.key]})));
 useEffect(()=>{if(!open)return;let active=true;void loadMatchSummary(match.id).then(data=>{if(active)setPlayers(data.players);}).catch(reason=>{if(active)setError(matchError(reason));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[open,match.id]);
 return <>
  <View style={[styles.matchCard,{borderLeftColor:palette.accent}]}><LinearGradient pointerEvents="none" colors={[palette.glow,'rgba(15,16,20,0)']} start={{x:0,y:0}} end={{x:0.8,y:1}} style={styles.fill}/><View pointerEvents="none" style={[styles.accent,{backgroundColor:palette.accent}]}/>
   <Text style={styles.date}>{match.played_on}{match.venue==='away'?' · Visitante':match.venue==='home'?' · Local':''}</Text><View style={styles.matchTeams}><View style={styles.club}><ClubBadge key={team.photoUrl??team.id} url={team.photoUrl} name={team.clubs?.name??team.name} size={50}/><Text style={styles.clubName}>{team.name}</Text></View><View style={styles.result}><Text style={styles.score}>{match.goals_for} – {match.goals_against}</Text><Text style={[styles.outcome,{color:palette.accent}]}>{palette.label}</Text></View><View style={styles.club}><MaterialCommunityIcons name="shield-outline" size={40} color="#D4C8CE"/><Text style={styles.clubName}>{match.opponent}</Text></View></View>
   <Pressable accessibilityRole="button" accessibilityLabel={`Resumen contra ${match.opponent}`} onPress={()=>{setLoading(true);setError('');setOpen(true);}} style={styles.footer}><MaterialCommunityIcons name="clipboard-text-outline" size={20} color={colors.white}/><Text style={styles.summaryLink}>Resumen</Text><MaterialCommunityIcons name="chevron-right" size={22} color={colors.white}/></Pressable>
  </View>
  <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}><View style={styles.backdrop}><View accessibilityViewIsModal style={styles.sheet}>
   <View style={styles.summaryHeader}><Text accessibilityRole="header" style={styles.summaryTitle}>Resumen del partido</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar resumen" onPress={()=>setOpen(false)} style={styles.close}><MaterialCommunityIcons name="close" size={25} color={colors.white}/></Pressable></View>
   <ScrollView contentContainerStyle={styles.summaryContent}><Text style={styles.summaryMatch}>{team.name} {match.goals_for} – {match.goals_against} {match.opponent}</Text><Text style={styles.date}>{match.played_on} · {palette.label}</Text><Text style={styles.sectionTitle}>ACCIONES DEL PARTIDO</Text>
    {loading&&<ActivityIndicator color={colors.red}/>}{!!error&&<Text accessibilityRole="alert" style={styles.message}>{error}</Text>}
    {!loading&&!error&&actions.map(({player,action,count})=><View key={player.slot_id+'-'+action.key} style={styles.event}>
     <PersonAvatar key={player.photoUrl??player.slot_id} url={player.photoUrl} name={player.player_name}/>
     <View style={styles.eventCopy}><Text style={styles.playerName}>{player.player_name}</Text><View style={styles.action}><MaterialCommunityIcons name={action.icon} size={20} color={action.color}/><Text style={styles.actionLabel}>{count===1?action.label:action.plural}</Text></View></View>
     <Text accessibilityLabel={count+' '+action.plural.toLowerCase()} style={[styles.eventCount,{color:action.color}]}>{count}</Text>
    </View>)}
    {!loading&&!error&&actions.length===0&&<Text style={styles.message}>No hubo goles, asistencias ni tarjetas registradas.</Text>}
   </ScrollView>
  </View></View></Modal>
 </>;
}
const styles=StyleSheet.create({event:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#35212B'},eventCopy:{flex:1,minWidth:0},eventCount:{fontSize:22,fontWeight:'900',minWidth:28,textAlign:'center'},content:{paddingHorizontal:18,paddingBottom:40},eyebrow:{color:colors.redBright,fontSize:10,fontWeight:'900',letterSpacing:1.8},title:{color:colors.white,fontSize:30,fontWeight:'900',marginTop:5},subtitle:{color:'#D5CAD0',fontSize:12,marginTop:4,marginBottom:22},message:{color:'#DDD1D8',fontSize:13,lineHeight:22,marginVertical:16},teamChoices:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:18},teamChoice:{padding:12,borderRadius:16,borderWidth:1,borderColor:colors.border},teamChoiceSelected:{borderColor:colors.redBright,backgroundColor:'rgba(229,9,27,0.18)'},teamChoiceText:{color:colors.white,fontWeight:'700',fontSize:12},matchCard:{backgroundColor:'rgba(12,14,18,0.94)',borderWidth:1,borderColor:'rgba(255,255,255,0.1)',borderRadius:18,overflow:'hidden',padding:14,marginBottom:12},fill:{position:'absolute',top:0,bottom:0,left:0,right:0},accent:{position:'absolute',left:0,top:22,bottom:22,width:3,borderRadius:2},date:{color:'#E4E4E4',fontSize:10,fontWeight:'700',marginBottom:15,marginTop:8,textAlign:'center'},matchTeams:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},club:{alignItems:'center',width:84},clubName:{color:colors.white,fontSize:11,fontWeight:'800',marginTop:7,textAlign:'center'},result:{alignItems:'center',flex:1},score:{color:colors.white,fontSize:24,fontWeight:'900'},outcome:{fontSize:11,fontWeight:'900',marginTop:7},footer:{flexDirection:'row',alignItems:'center',borderTopWidth:1,borderTopColor:'rgba(255,255,255,0.2)',marginTop:14,paddingTop:12,paddingBottom:4,minHeight:44},summaryLink:{flex:1,color:colors.white,fontSize:13,fontWeight:'900',marginLeft:9},backdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.78)',alignItems:'center',justifyContent:'center',paddingHorizontal:18,paddingVertical:44},sheet:{width:'100%',maxWidth:520,maxHeight:'90%',backgroundColor:'#100D12',borderWidth:1,borderColor:'#69313F',borderTopLeftRadius:26,borderTopRightRadius:8,borderBottomRightRadius:26,borderBottomLeftRadius:8,overflow:'hidden'},summaryHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:18,paddingRight:8,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#38232D'},summaryTitle:{color:colors.white,fontSize:19,fontWeight:'900'},close:{width:44,height:44,alignItems:'center',justifyContent:'center'},summaryContent:{padding:18,paddingBottom:28},summaryMatch:{color:colors.white,fontSize:19,fontWeight:'900',textAlign:'center'},sectionTitle:{color:'#DBCBD2',fontSize:10,fontWeight:'900',letterSpacing:1.6,marginBottom:10,marginTop:8},performance:{paddingVertical:16,borderBottomWidth:1,borderBottomColor:'#35212B'},person:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:12},playerName:{color:colors.white,fontSize:14,fontWeight:'800'},playerPosition:{color:'#DACAD1',fontSize:10,marginTop:5},action:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:6},actionLabel:{flex:1,color:'#E8DCE1',fontSize:12},actionValue:{color:colors.white,fontSize:13,fontWeight:'800'},points:{color:'#FF788A',fontSize:12,fontWeight:'900',marginTop:10}});
