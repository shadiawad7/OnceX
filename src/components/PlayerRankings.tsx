import { textShadow } from '../theme/textShadow';
import SelectionList from './SelectionList';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import PodiumWaves from './PodiumWaves';
import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import ProfilePortrait from './ProfilePortrait';
import { profilePhotoUrls } from '../lib/profilePhotos';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { client } from '../lib/hierarchy';
import { adminError } from '../lib/admin';
import { rankPlayers, type RankingPlayer } from '../lib/rankings';
import { colors, podiumGoldColorPercent, podiumSilverColorPercent, podiumBronzeColorPercent, podiumShadowOpacityPercent, playerColorWithOpacity, podiumPhotoBlendHeightPercent, podiumPhotoBlendOpacityPercent } from '../theme/colors';
const groups = [{label:'POR EQUIPOS',field:'team_id'},{label:'POR CLUB',field:''},{label:'POR POSICIÓN',field:'player_position'}] as const;
export default function PlayerRankings({ clubId, teamId, viewerPlayerId, canOpenProfiles, showTitle = true, headerContent }: { clubId?: string; teamId?: string; viewerPlayerId?: string; canOpenProfiles: boolean; showTitle?: boolean; headerContent?: ReactNode }) {
 const [clubs,setClubs]=useState<{id:string;name:string}[]>([]);
 const [selectedClub,setSelectedClub]=useState(clubId ?? '');
 const [rows,setRows]=useState<RankingPlayer[]>([]);
 const [group,setGroup]=useState(1);
 const [filter,setFilter]=useState('');
 const [viewerPosition,setViewerPosition]=useState('');
 const [viewerTeamIds,setViewerTeamIds]=useState<string[]>([]);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [retry,setRetry]=useState(0);
 useFocusEffect(useCallback(()=> {
  let active=true;
  setViewerPosition('');setViewerTeamIds([]);
  setLoading(true);setError('');setRows([]);
  async function load() {
   if(viewerPlayerId){const profile=await client().from('profiles').select('position').eq('id',viewerPlayerId).single();if(profile.error)throw profile.error;if(active)setViewerPosition(profile.data.position??'');}
   const clubsResult=await client().from('clubs').select('id,name').order('name');
   if(clubsResult.error) throw clubsResult.error;
   const list=clubsResult.data;
   const club=list.some(item=>item.id===selectedClub) ? selectedClub : list[0]?.id;
   if(!active) return;
   setClubs(list);
   if(!club) {setLoading(false);return;}
   if(club!==selectedClub) {setSelectedClub(club);return;}
   if(viewerPlayerId){const membership=await client().from('team_members').select('team_id').eq('user_id',viewerPlayerId).eq('role_code','player').eq('club_id',club).order('team_id');if(membership.error)throw membership.error;if(active)setViewerTeamIds(membership.data.map(item=>item.team_id));}
   const access=await client().rpc('viewer_club_plan',{target_club:club});
   if(access.error)throw access.error;
   if(access.data==='basic')throw new Error('Para comparar todos los jugadores del club, activa la migración 202610210001_oncex_single_plan.sql en Supabase.');
   const request=client().rpc('club_player_rankings',{target_club:club});
   const result=await (teamId ? request.eq('team_id',teamId) : request);
   if(result.error) throw result.error;
   const records=(result.data as RankingPlayer[]).filter(row=>!teamId||row.team_id===teamId);
   const photos=await profilePhotoUrls(records.map(row=>row.photo_path??''));
   if(active) {setRows(records.map(row=>({...row,photo_url:photos.get(row.photo_path??'')})));setLoading(false);}
  }
  void load().catch(reason=> {if(active) {setLoading(false);setError(reason?.code==='PGRST202' || reason?.code==='42883' ? 'Los rankings todavía no están activados para este club.' : adminError(reason));}});
  return ()=> {active=false;};
 // retry deliberately reloads the request even when the selected club is unchanged.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[selectedClub,retry,teamId,viewerPlayerId]));
 const field=groups[group].field;
 const options=group===0?[...new Map(rows.map(row=>[row.team_id,{value:row.team_id,label:row.team_name}])).values()]:['Portero','Defensa','Centrocampista','Delantero'].map(position=>({value:position,label:position}));
 const selectedFilter=group===0&&viewerPlayerId?viewerTeamIds[0]??'':group===2&&viewerPlayerId?viewerPosition:options.some(option=>option.value===filter)?filter:options[0]?.value??'';
 const players=teamId?rankPlayers(rows,'team_id',teamId):group===1?rankPlayers(rows,'',''):selectedFilter?rankPlayers(rows,field,selectedFilter):[];
 const podium=players.slice(0,3);
 const tablePlayers=players;
 function open(id:string) {if(canOpenProfiles) router.push({pathname:'/players/[id]',params:{id}});}
 const header=<>
  {headerContent}
  {showTitle && <View style={styles.clubHeader}><View style={styles.titleLockup}><Text style={styles.trophy}>♛</Text><Text style={styles.title}>RANKINGS ONCEX</Text></View></View>}
  {!teamId&&<View style={styles.tabs}>{groups.map((item,index)=> <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected:group===index}} style={[styles.tab,group===index&&styles.active]} onPress={()=> {setGroup(index);setFilter('');}}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.tabText}>{item.label}</Text></Pressable>)}</View>}
  {!teamId&&clubs.length>1&&<SelectionList label="Club del ranking" value={selectedClub} options={clubs.map(club=>({value:club.id,label:club.name}))} onChange={club=>{setSelectedClub(club);setFilter('');}}/>}
  {!teamId&&!viewerPlayerId&&group!==1&&<SelectionList label={group===0?'Equipo del ranking':'Posición del ranking'} value={selectedFilter} options={options} onChange={setFilter} disabled={loading||options.length===0}/>}
  {!teamId&&group===2&&!!viewerPlayerId&&!loading&&<Text style={styles.hint}>{viewerPosition?`Posición: ${viewerPosition}`:'Tu entrenador debe asignarte una posición para ver este ranking.'}</Text>}
  {!teamId&&group===0&&!!viewerPlayerId&&!loading&&<Text style={styles.hint}>{selectedFilter?`Equipo: ${rows.find(row=>row.team_id===selectedFilter)?.team_name??'Tu equipo'}`:'Todavía no tienes un equipo asignado en este club.'}</Text>}
  <View style={[styles.podium,!!teamId&&styles.teamPodium]}>{[1,0,2].map((playerIndex,index)=> {
   const player=podium[playerIndex];
   const metal=['#E5EDF5','#FFD43B','#FF8B47'][index];
   const shadowOpacity = Math.min(100, Math.max(0, podiumShadowOpacityPercent)) / 100;
   const metalOpacity = Math.min(100, Math.max(0, [podiumGoldColorPercent, podiumSilverColorPercent, podiumBronzeColorPercent][index])) / 100;
   const shades = index===1 ? ['#FFE77A','#D99500','#8F5100'] as const : index===0 ? ['#F4F8FC','#A2AFBC','#536372'] as const : ['#FFBE83','#E56723','#8F2E0D'] as const;
   if(!player) return <View key={`empty-${index}`} style={[styles.podiumCard,{borderColor:metal,boxShadow:`0px 0px 10px 3px rgba(0,0,0,${shadowOpacity}), 0px 6px 12px rgba(0,0,0,${0.8 * shadowOpacity})`},index===1&&styles.winner]}>{index===1 && <MaterialCommunityIcons name="crown" size={34} color="#FFD43B" style={styles.crown} />}<View style={[styles.medal,{borderColor:metal,backgroundColor:metal}]}><View pointerEvents="none" style={styles.medalRing}/><Text style={[styles.medalNumber,{color:'#15100B'}]}>{index+1}</Text></View><View style={[styles.cardInner,index===0&&styles.emptyCardInner]}><View pointerEvents="none" style={[styles.metalLayer,{opacity:metalOpacity}]}><LinearGradient colors={shades} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.metalLayer} /><PodiumWaves color={metal} /></View><View style={[styles.portrait,index===1&&styles.winnerPortrait,styles.emptyPortrait]}/><View style={styles.caption}><Text style={styles.name}>Pendiente</Text><Text style={styles.detail}>Jugador no registrado</Text></View><View style={[styles.scorePanel,{borderColor:metal}]}><Text style={styles.scoreLabel}>ONCEX SCORE</Text><Text style={[styles.score,{color:metal}]}>—</Text></View></View></View>;
return <Pressable key={player.player_id} accessibilityRole="button" disabled={!canOpenProfiles} onPress={()=>open(player.player_id)} style={[styles.podiumCard,{borderColor:metal,boxShadow:`0px 0px 10px 3px rgba(0,0,0,${shadowOpacity}), 0px 6px 12px rgba(0,0,0,${0.8 * shadowOpacity})`},index===1&&styles.winner]}>{index===1 && <MaterialCommunityIcons name="crown" size={34} color="#FFD43B" style={styles.crown} />}
 <View style={[styles.medal,{borderColor:metal,backgroundColor:metal}]}><View pointerEvents="none" style={styles.medalRing}/><Text style={[styles.medalNumber,{color:'#15100B'}]}>{player.rank}</Text></View>
 <View style={styles.cardInner}>
 <View pointerEvents="none" style={[styles.metalLayer,{opacity:metalOpacity}]}><LinearGradient colors={shades} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.metalLayer} /><PodiumWaves color={metal} /></View>
     
     <View style={[styles.portrait,index===1&&styles.winnerPortrait]}>
       <LinearGradient pointerEvents="none" colors={[playerColorWithOpacity('#03070C',82),playerColorWithOpacity('#07121B',58),'rgba(3,7,12,0)']} locations={[0,0.52,1]} style={styles.topShadow}/>
       <MaterialCommunityIcons name="shield-star" size={190} color={metal} style={styles.cardShield} />
       <View style={styles.fifaRail}><Text style={styles.cardRatingValue}>{player.oncex_score??0}</Text><Text style={styles.cardRatingLabel}>{player.player_position?.slice(0,2).toUpperCase()||'ST'}</Text><View style={styles.fifaLine}/><View style={[styles.flag,{backgroundColor:metal}]} /><View style={styles.fifaLine}/><MaterialCommunityIcons name="shield-star" size={30} color="#FFFFFF" /></View>
       <ProfilePortrait key={player.photo_url} url={player.photo_url} name={player.full_name} style={styles.integratedPortrait}/>
       <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', playerColorWithOpacity(shades[2], 15 * metalOpacity), playerColorWithOpacity(shades[2], 90 * metalOpacity)]} locations={[0,0.6,1]} style={[styles.photoBlend,{top:undefined,height:`${Math.min(100,Math.max(0,podiumPhotoBlendHeightPercent))}%`,opacity:Math.min(100,Math.max(0,podiumPhotoBlendOpacityPercent))/100}]}/>
       <LinearGradient pointerEvents="none" colors={[playerColorWithOpacity(metal, 15 * metalOpacity), playerColorWithOpacity(metal, 0), playerColorWithOpacity(metal, 0), playerColorWithOpacity(metal, 15 * metalOpacity)]} locations={[0,0.18,0.82,1]} start={{x:0,y:0}} end={{x:1,y:0}} style={[styles.photoBlend,{opacity:Math.min(100,Math.max(0,podiumPhotoBlendOpacityPercent))/100}]}/>
     </View>
     <View style={styles.caption}><Text numberOfLines={2} style={styles.name}>{player.full_name}</Text><Text numberOfLines={2} style={styles.detail}>{player.team_name}</Text><Text numberOfLines={1} style={styles.detail}>{player.player_position||'Sin posición'}</Text></View>
     <View style={[styles.scorePanel,{borderColor:metal}]}><Text style={styles.scoreLabel}>ONCEX SCORE</Text><Text style={[styles.score,{color:metal}]}>{player.oncex_score??0}</Text></View>
    </View>
   </Pressable>;
  })}</View>
  {!!error && <><Text style={styles.error}>{error}</Text><Button label="REINTENTAR" onPress={()=>setRetry(value=>value+1)}/></>}{loading && <ActivityIndicator color={colors.red}/>}
  {!loading && !error && players.length>0 && !podium.length && <Text style={styles.hint}>El podio aparecerá cuando haya puntuaciones calculadas desde los partidos.</Text>}
  <View style={styles.tableHeader}><LinearGradient pointerEvents="none" colors={['#151515', '#050505']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.tableWash} />{[{label:'#',style:styles.rankColumn},{label:'FOTO',style:styles.photoColumn},{label:'JUGADOR',style:styles.playerColumn},{label:'EQUIPO',style:styles.teamColumn},{label:'POSICIÓN',style:styles.positionColumn},{label:'ONCEX SCORE',style:styles.scoreColumn}].map(column=><View key={column.label} style={column.style}><Text style={styles.columnLabel}>{column.label}</Text></View>)}<View style={styles.arrowColumn}/></View>
 </>;
 return <View style={styles.screen}><FlatList data={loading ? [] : tablePlayers} keyExtractor={item=>item.player_id} contentContainerStyle={styles.content} ListHeaderComponent={header} ListEmptyComponent={!loading&&!error&&players.length===0 ? <Text style={styles.hint}>{clubs.length ? 'Todavía no hay jugadores en este grupo.' : 'Todavía no tienes un club asignado.'}</Text>:undefined} renderItem={({item,index})=> {
  const color=item.oncex_score!==null&&item.oncex_score>=80?'#A4E4B5':'#66C7FF';
  return <Pressable accessibilityRole="button" disabled={!canOpenProfiles} onPress={()=>open(item.player_id)} style={[styles.row,index%2===1&&styles.alternate]}><LinearGradient pointerEvents="none" colors={['#111111', '#050505', '#000000']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.tableWash} /><Text style={[styles.rowText,styles.rankColumn]}>{item.rank??'—'}</Text><View style={styles.photoColumn}><ProfilePortrait key={item.photo_url} url={item.photo_url} name={item.full_name} style={styles.smallPortrait}/></View><Text numberOfLines={2} ellipsizeMode="tail" style={[styles.playerColumn,styles.rowName]}>{item.full_name}</Text><Text numberOfLines={2} style={[styles.cellText,styles.teamColumn]}>{item.team_name}</Text><Text numberOfLines={2} style={[styles.cellText,styles.positionColumn]}>{item.player_position||'Sin definir'}</Text><View style={styles.scoreColumn}><Text style={[styles.badge,{color},item.oncex_score===null&&styles.unrated]}>{item.oncex_score??0}</Text>{item.oncex_score===null && <Text style={styles.pending}>Sin evaluar</Text>}</View><Text style={[styles.chevron,styles.arrowColumn]}>{canOpenProfiles?'›':''}</Text></Pressable>;
 }}/></View>;
}
const styles=StyleSheet.create({
 teamPodium:{marginTop:62},
 medalRing:{position:'absolute',top:3,bottom:3,left:3,right:3,borderRadius:30,borderWidth:1,borderColor:'rgba(65,35,8,0.4)',borderTopColor:'rgba(255,255,255,0.8)',borderLeftColor:'rgba(255,255,255,0.6)'},
 integratedPortrait:{position:'absolute',top:-12,bottom:-6,left:5,right:5,backgroundColor:'transparent',zIndex:2},photoBlend:{position:'absolute',top:0,bottom:0,left:0,right:0,zIndex:3},
 proLabel:{color:'#D9B45D',fontSize:8,fontWeight:'900',textAlign:'center',marginTop:3},
 metalLayer:{position:'absolute',top:0,bottom:0,left:0,right:0},
 tableWash:{position:'absolute',top:0,bottom:0,left:0,right:0},
 screen:{flex:1,backgroundColor:'transparent'},content:{paddingHorizontal:14,paddingTop:12,paddingBottom:40},clubHeader:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:2},clubPicker:{flex:1},title:{color:colors.white,fontSize:18,fontWeight:'900',letterSpacing:2.2},titleLockup:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},trophy:{color:'#FFCF38',fontSize:24,fontWeight:'900'},hint:{color:colors.muted,marginVertical:14,lineHeight:20,fontSize:12},tabs:{flexDirection:'row',gap:5,marginTop:12,marginBottom:18},tab:{flex:1,borderRadius:24,borderWidth:1.5,borderColor:'#454B50',backgroundColor:'#14191E',paddingHorizontal:4,paddingVertical:12,minHeight:44,justifyContent:'center'},active:{backgroundColor:'#F50920',borderColor:'#FF4B59',boxShadow:'0px 0px 12px rgba(245,9,32,0.45)'},tabText:{color:colors.white,fontSize:9,fontWeight:'900',textAlign:'center',letterSpacing:0},podium:{flexDirection:'row',alignItems:'flex-end',gap:6,marginTop:46,marginBottom:34,paddingHorizontal:2},podiumCard:{flex:1,minWidth:0,borderWidth:1.5,borderRadius:15,backgroundColor:'#080B0F',overflow:'visible'},podiumSpace:{flex:1},winner:{borderWidth:2,transform:[{scale:1.045}]},cardInner:{position:'relative',borderRadius:13,padding:3,paddingTop:4,overflow:'hidden',backgroundColor:'#101923',borderBottomWidth:7,borderBottomColor:'#071018'},cardShield:{position:'absolute',zIndex:0,top:-35,alignSelf:'center',opacity:.22,transform:[{scaleX:1.18}]},topShadow:{position:'absolute',zIndex:6,top:0,left:0,right:0,height:'68%',borderTopLeftRadius:12,borderTopRightRadius:12},fifaRail:{position:'absolute',zIndex:7,left:5,top:8,bottom:7,width:36,alignItems:'center',paddingTop:2,backgroundColor:'rgba(3,12,20,.42)'},cardRatingValue:{color:'#FFFFFF',fontSize:25,lineHeight:28,fontWeight:'900',fontStyle:'italic',textShadowColor:'#000',textShadowRadius:3},cardRatingLabel:{color:'#FFFFFF',fontSize:11,fontWeight:'900',letterSpacing:1,textShadowColor:'#000',textShadowRadius:2},fifaLine:{width:27,height:1,backgroundColor:'rgba(255,255,255,.9)',marginVertical:7},flag:{width:26,height:16,borderWidth:1,borderColor:'rgba(255,255,255,.8)'},cardRating:{position:'absolute',zIndex:4,left:9,top:13,alignItems:'center'},medal:{position:'absolute',zIndex:8,top:-17,left:-8,width:43,height:43,borderRadius:22,borderWidth:2,backgroundColor:'#E8EDF1',alignItems:'center',justifyContent:'center',boxShadow:'0px 2px 4px rgba(0,0,0,0.55)',elevation:5},medalNumber:{fontSize:28,lineHeight:34,fontWeight:'900',fontStyle:'italic',textAlign:'center',paddingRight:3,...textShadow('rgba(255,255,255,0.65)',1,0,1)},crown:{position:'absolute',zIndex:9,top:-46,alignSelf:'center',...textShadow('rgba(255,190,0,0.65)',6,0,0)},portrait:{width:'100%',aspectRatio:0.82,backgroundColor:'transparent',borderRadius:11,overflow:'hidden'},winnerPortrait:{aspectRatio:0.74},emptyPortrait:{backgroundColor:'#030405'},emptyCardInner:{backgroundColor:'#050608'},caption:{paddingTop:12,paddingBottom:7,paddingHorizontal:3,alignItems:'center',minHeight:68},name:{color:colors.white,fontSize:12,fontWeight:'900',textAlign:'center',minHeight:30,...textShadow('#000000',4,0,1)},detail:{color:'#FFFFFF',fontSize:11,lineHeight:15,fontWeight:'700',marginTop:3,textAlign:'center',...textShadow('rgba(0,0,0,0.95)',4,0,1)},scorePanel:{alignItems:'center',justifyContent:'center',alignSelf:'stretch',minHeight:82,paddingHorizontal:4,paddingVertical:9,marginTop:9,marginBottom:2,borderRadius:16,borderWidth:1.5,backgroundColor:'rgba(5,5,7,0.88)',boxShadow:'none'},scoreLabel:{color:'#F2F2F2',fontSize:8,fontWeight:'900',textAlign:'center',marginBottom:2},score:{fontSize:42,lineHeight:48,fontWeight:'900',fontVariant:['tabular-nums']},tableHeader:{flexDirection:'row',alignItems:'center',paddingVertical:16,paddingHorizontal:6,borderTopLeftRadius:20,borderTopRightRadius:6,overflow:'hidden',borderBottomWidth:1,borderColor:'rgba(255,70,90,0.45)',marginBottom:8},columnLabel:{width:'100%',textAlign:'center',color:'#FFFFFF',fontSize:13,lineHeight:17,fontWeight:'900',letterSpacing:0},rankColumn:{width:20,textAlign:'center'},playerColumn:{flex:1,minWidth:0,paddingHorizontal:4},teamColumn:{flex:1,minWidth:0,paddingHorizontal:4},positionColumn:{flex:1,minWidth:0,paddingHorizontal:4},scoreColumn:{width:56,textAlign:'center',alignItems:'center'},arrowColumn:{width:10},row:{flexDirection:'row',alignItems:'center',paddingHorizontal:6,paddingVertical:14,minHeight:76,borderTopLeftRadius:18,borderTopRightRadius:5,borderBottomRightRadius:18,borderBottomLeftRadius:5,overflow:'hidden',marginBottom:8,borderBottomWidth:1,borderColor:'rgba(255,80,100,0.16)'},alternate:{backgroundColor:'#080808'},rowText:{textAlign:'center',color:colors.white,fontSize:13,fontWeight:'700'},photoColumn:{width:50,flexShrink:0,alignItems:'center',justifyContent:'center',textAlign:'center'},smallPortrait:{width:42,height:42,flexShrink:0,borderRadius:21,borderWidth:1,borderColor:'rgba(255,90,110,0.45)'},rowName:{color:colors.white,fontSize:13,fontWeight:'700',textAlign:'center'},cellText:{textAlign:'center',color:'#E0D6DA',fontSize:12},badge:{borderWidth:1.5,borderColor:colors.redBright,borderRadius:9,paddingHorizontal:6,paddingVertical:5,fontWeight:'900',fontSize:16,minWidth:39,textAlign:'center',backgroundColor:'#080808',fontVariant:['tabular-nums']},unrated:{color:'#F0E4E7'},pending:{fontSize:8,color:'#D6BBC2',marginTop:4},chevron:{textAlign:'center',color:'#C4CDD5',fontSize:20},error:{color:colors.redBright,marginVertical:12}
});
