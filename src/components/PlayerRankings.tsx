import { LinearGradient } from 'expo-linear-gradient';
import ProfilePortrait from './ProfilePortrait';
import { profilePhotoUrls } from '../lib/profilePhotos';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import SelectionList from './SelectionList';
import Button from './Button';
import { client } from '../lib/hierarchy';
import { adminError } from '../lib/admin';
import { rankPlayers, type RankingPlayer } from '../lib/rankings';
import { colors } from '../theme/colors';
const groups = [{ label:'GLOBAL CLUB',field:'' },{label:'POR EQUIPO',field:'team_id'},{label:'POR POSICIÓN',field:'player_position'},{label:'POR CATEGORÍA',field:'category'}] as const;
export default function PlayerRankings({ clubId, canOpenProfiles }: { clubId?: string; canOpenProfiles: boolean }) {
 const [clubs,setClubs]=useState<{id:string;name:string}[]>([]);
 const [selectedClub,setSelectedClub]=useState(clubId ?? '');
 const [rows,setRows]=useState<RankingPlayer[]>([]);
 const [group,setGroup]=useState(0);
 const [filter,setFilter]=useState('');
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [retry,setRetry]=useState(0);
 useFocusEffect(useCallback(()=> {
  let active=true;
  setLoading(true);setError('');setRows([]);
  async function load() {
   const clubsResult=await client().from('clubs').select('id,name').order('name');
   if(clubsResult.error) throw clubsResult.error;
   const list=clubsResult.data;
   const club=list.some(item=>item.id===selectedClub) ? selectedClub : list[0]?.id;
   if(!active) return;
   setClubs(list);
   if(!club) {setLoading(false);return;}
   if(club!==selectedClub) {setSelectedClub(club);return;}
   const result=await client().rpc('club_player_rankings',{target_club:club});
   if(result.error) throw result.error;
   const records=result.data as RankingPlayer[];
   const photos=await profilePhotoUrls(records.map(row=>row.photo_path??''));
   if(active) {setRows(records.map(row=>({...row,photo_url:photos.get(row.photo_path??'')})));setLoading(false);}
  }
  void load().catch(reason=> {if(active) {setLoading(false);setError(reason?.code==='PGRST202' || reason?.code==='42883' ? 'Los rankings todavía no están activados para este club.' : adminError(reason));}});
  return ()=> {active=false;};
 // retry deliberately reloads the request even when the selected club is unchanged.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[selectedClub,retry]));
 const field=groups[group].field;
 const choices=field ? [...new Set(rows.map(row=>row[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).map(value=>({value,label:field==='team_id' ? rows.find(row=>row.team_id===value)!.team_name : value})) : [];
 const players=rankPlayers(rows,field,filter);
 const podium=players.slice(0,3);
 const podiumIds=new Set(podium.map(player=>player.player_id));
 const tablePlayers=players.filter(player=>!podiumIds.has(player.player_id));
 function open(id:string) {if(canOpenProfiles) router.push({pathname:'/players/[id]',params:{id}});}
 const header=<>
  <View style={styles.clubHeader}><View style={styles.titleLockup}><Text style={styles.trophy}>♛</Text><Text style={styles.title}>RANKINGS ONCEX</Text></View>{clubs.length>0 && <View style={styles.clubPicker}><SelectionList label="Club" value={selectedClub} options={clubs.map(club=>({value:club.id,label:club.name}))} onChange={value=> {setSelectedClub(value);setFilter('');}}/></View>}</View>
  <View style={styles.tabs}>{groups.map((item,index)=><Pressable key={item.label} accessibilityRole="button" accessibilityState={{selected:group===index}} style={[styles.tab,group===index&&styles.active]} onPress={()=> {setGroup(index);setFilter('');}}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.tabText}>{item.label}</Text></Pressable>)}</View>
  {!!field && <SelectionList label={groups[group].label} value={filter} options={[{value:'',label:'Todos'},...choices]} onChange={setFilter}/>}
  <View style={styles.podium}>{[1,0,2].map(index=> {
   const player=podium[index];
   const metal=['#F4C64F','#BCC6CE','#DB925C'][index];
   const shades = index===0 ? ['#FFE58A','#7A510A','#251905'] as const : index===1 ? ['#D9E3E8','#4A535B','#151A20'] as const : ['#F2AE79','#693419','#22120C'] as const;
   if(!player) return <View key={`empty-${index}`} style={[styles.podiumCard,{borderColor:metal},index===0&&styles.winner]}><View style={[styles.cardInner,index===0&&styles.emptyCardInner]}>{index===0 && <Text style={styles.crown}>♛</Text>}<View style={[styles.medal,{borderColor:metal}]}><Text style={[styles.medalNumber,{color:metal}]}>{index+1}</Text></View><View style={[styles.portrait,index===0&&styles.winnerPortrait,styles.emptyPortrait]}/><View style={styles.caption}><Text style={styles.name}>Pendiente</Text><Text style={styles.detail}>Jugador no registrado</Text></View><View style={[styles.scorePanel,{borderColor:metal}]}><Text style={styles.scoreLabel}>ONCEX SCORE</Text><Text style={[styles.score,{color:metal}]}>—</Text></View></View></View>;
   return <Pressable key={player.player_id} accessibilityRole="button" disabled={!canOpenProfiles} onPress={()=>open(player.player_id)} style={[styles.podiumCard,{borderColor:metal},index===0&&styles.winner]}>
    <LinearGradient colors={shades} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.cardInner}>
     {index===0 && <Text style={styles.crown}>♛</Text>}<View style={[styles.medal,{borderColor:metal}]}><Text style={[styles.medalNumber,{color:metal}]}>{player.rank}</Text></View>
     <ProfilePortrait key={player.photo_url} url={player.photo_url} name={player.full_name} style={[styles.portrait,index===0&&styles.winnerPortrait]}/>
     <LinearGradient colors={['transparent','#080B10']} style={styles.caption}><Text numberOfLines={2} style={styles.name}>{player.full_name}</Text><Text numberOfLines={1} style={styles.detail}>{player.team_name}</Text><Text numberOfLines={1} style={styles.detail}>{player.player_position||'Sin posición'}</Text></LinearGradient>
     <View style={[styles.scorePanel,{borderColor:metal}]}><Text style={styles.scoreLabel}>ONCEX SCORE</Text><Text style={[styles.score,{color:metal}]}>{player.oncex_score??'—'}</Text></View>
    </LinearGradient>
   </Pressable>;
  })}</View>
  {!!error && <><Text style={styles.error}>{error}</Text><Button label="REINTENTAR" onPress={()=>setRetry(value=>value+1)}/></>}{loading && <ActivityIndicator color={colors.red}/>}
  {!loading && !error && players.length>0 && !podium.length && <Text style={styles.hint}>El podio aparecerá cuando haya puntuaciones calculadas desde los partidos.</Text>}
  <View style={styles.tableHeader}><Text style={[styles.columnLabel,styles.rankColumn]}>#</Text><Text style={[styles.columnLabel,styles.playerColumn]}>JUGADOR</Text><Text style={[styles.columnLabel,styles.teamColumn]}>EQUIPO</Text><Text style={[styles.columnLabel,styles.positionColumn]}>POSICIÓN</Text><Text style={[styles.columnLabel,styles.scoreColumn]}>ONCEX SCORE</Text><View style={styles.arrowColumn}/></View>
 </>;
 return <View style={styles.screen}><LinearGradient colors={['#5E0A13','#250A10','#090A0D']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}/><FlatList data={loading ? [] : tablePlayers} keyExtractor={item=>item.player_id} contentContainerStyle={styles.content} ListHeaderComponent={header} ListEmptyComponent={!loading&&!error&&players.length===0 ? <Text style={styles.hint}>{clubs.length ? 'Todavía no hay jugadores en este grupo.' : 'Todavía no tienes un club asignado.'}</Text>:null} renderItem={({item,index})=> {
  const color=item.oncex_score!==null&&item.oncex_score>=80?'#A4E4B5':'#66C7FF';
  return <Pressable accessibilityRole="button" disabled={!canOpenProfiles} onPress={()=>open(item.player_id)} style={[styles.row,index%2===1&&styles.alternate]}><Text style={[styles.rowText,styles.rankColumn]}>{item.rank??'—'}</Text><View style={[styles.playerColumn,styles.playerCell]}><ProfilePortrait key={item.photo_url} url={item.photo_url} name={item.full_name} style={styles.smallPortrait}/><Text numberOfLines={2} style={styles.rowName}>{item.full_name}</Text></View><Text numberOfLines={2} style={[styles.cellText,styles.teamColumn]}>{item.team_name}</Text><Text numberOfLines={2} style={[styles.cellText,styles.positionColumn]}>{item.player_position||'Sin definir'}</Text><View style={styles.scoreColumn}><Text style={[styles.badge,{color,borderColor:color},item.oncex_score===null&&styles.unrated]}>{item.oncex_score??'—'}</Text>{item.oncex_score===null && <Text style={styles.pending}>Sin evaluar</Text>}</View><Text style={[styles.chevron,styles.arrowColumn]}>{canOpenProfiles?'›':''}</Text></Pressable>;
 }}/></View>;
}
const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#090C10'},content:{paddingHorizontal:14,paddingTop:12,paddingBottom:40},clubHeader:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:2},clubPicker:{flex:1},title:{color:colors.white,fontSize:18,fontWeight:'900',letterSpacing:2.2},titleLockup:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},trophy:{color:'#FFCF38',fontSize:24,fontWeight:'900'},hint:{color:colors.muted,marginVertical:14,lineHeight:20,fontSize:12},tabs:{flexDirection:'row',gap:4,marginTop:10,marginBottom:14},tab:{flex:1,borderRadius:7,borderWidth:1,borderColor:'#4A535C',backgroundColor:'#20252B',paddingHorizontal:3,paddingVertical:7,minHeight:32,justifyContent:'center'},active:{backgroundColor:'#F51B2D',borderColor:'#FF5360',boxShadow:'0px 4px 14px rgba(245,27,45,0.38)'},tabText:{color:colors.white,fontSize:9,fontWeight:'900',textAlign:'center',letterSpacing:.1},podium:{flexDirection:'row',alignItems:'flex-end',gap:5,marginTop:25,marginBottom:20},podiumCard:{flex:1,minWidth:0,borderWidth:2,borderRadius:16,backgroundColor:'#11161B',overflow:'visible'},podiumSpace:{flex:1},winner:{borderWidth:2,boxShadow:'0px 0px 22px rgba(244,198,79,0.42)',transform:[{scale:1.035}]},cardInner:{position:'relative',borderRadius:10,padding:4,paddingTop:10,overflow:'hidden'},medal:{position:'absolute',zIndex:2,top:-17,left:3,width:30,height:30,borderRadius:15,borderWidth:2,backgroundColor:'#1E2024',alignItems:'center',justifyContent:'center'},medalNumber:{fontSize:20,fontWeight:'900'},crown:{position:'absolute',zIndex:2,top:-34,alignSelf:'center',fontSize:28,color:'#FFCD3D'},portrait:{height:94,width:'100%',borderTopLeftRadius:7,borderTopRightRadius:7},winnerPortrait:{height:112},emptyPortrait:{backgroundColor:'#030405',borderRadius:8},emptyCardInner:{backgroundColor:'#090A0D'},caption:{marginTop:-8,paddingTop:15,paddingBottom:5,paddingHorizontal:3,alignItems:'center'},name:{color:colors.white,fontSize:11,fontWeight:'800',textAlign:'center',minHeight:28},detail:{color:'#CCD0D5',fontSize:9,marginTop:2,textAlign:'center'},scorePanel:{borderWidth:1,borderRadius:10,backgroundColor:'#090C10',alignItems:'center',paddingVertical:5,marginTop:4},scoreLabel:{color:'#D5D8DB',fontSize:8,fontWeight:'700'},score:{fontSize:33,fontWeight:'900'},tableHeader:{flexDirection:'row',alignItems:'center',paddingVertical:14,paddingHorizontal:6,backgroundColor:'#202830',borderTopLeftRadius:12,borderTopRightRadius:12,borderWidth:1,borderColor:'#414A53'},columnLabel:{color:'#CBD2D7',fontSize:7,fontWeight:'800'},rankColumn:{width:20},playerColumn:{flex:1.6,minWidth:0,paddingRight:4},teamColumn:{flex:0.8,minWidth:0,paddingRight:4},positionColumn:{flex:1,minWidth:0,paddingRight:4},scoreColumn:{width:56,textAlign:'center',alignItems:'center'},arrowColumn:{width:10},row:{flexDirection:'row',alignItems:'center',paddingHorizontal:6,paddingVertical:12,minHeight:58,backgroundColor:'#11191F',borderBottomWidth:1,borderLeftWidth:1,borderRightWidth:1,borderColor:'#303A43'},alternate:{backgroundColor:'#0D141A'},rowText:{color:colors.white,fontSize:11,fontWeight:'700'},playerCell:{flexDirection:'row',alignItems:'center',gap:5},smallPortrait:{width:26,height:26,borderRadius:13,borderWidth:1,borderColor:'#6D7780'},rowName:{color:colors.white,fontSize:10,fontWeight:'700',flex:1},cellText:{color:'#C6CBD0',fontSize:9},badge:{borderWidth:1,borderRadius:7,paddingHorizontal:5,paddingVertical:3,fontWeight:'900',fontSize:15,minWidth:35,textAlign:'center',backgroundColor:'#0C181B'},unrated:{color:colors.muted,borderColor:'#38414A'},pending:{fontSize:7,color:colors.muted,marginTop:3},chevron:{color:'#C4CDD5',fontSize:20},error:{color:colors.redBright,marginVertical:12}
});
