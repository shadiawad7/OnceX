import ClubBadge from '../../components/ClubBadge';
import { clubPhotoUrls } from '../../lib/clubPhotos';
import CoachAccessCard from '../../components/CoachAccessCard';
import TeamMatchesPanel from '../../components/TeamMatchesPanel';
import PlayerRankings from '../../components/PlayerRankings';
import DeleteHierarchyButton from '../../components/DeleteHierarchyButton';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import TeamPlanPanel from '../../components/TeamPlanPanel';
import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Text, StyleSheet, View, Pressable, ScrollView, BackHandler } from 'react-native';
import AccountShell from '../../components/AccountShell';
import HierarchyList from '../../components/HierarchyList';
import { client, creationCapability, listTeamPeople } from '../../lib/hierarchy';
import { colors } from '../../theme/colors';
import { adminError } from '../../lib/admin';
export default function TeamPage() {
 const { id, section } = useLocalSearchParams<{ id: string; section?: string }>();
 const [view,setView]=useState(section==='matches'?'matches':'overview');
 useFocusEffect(useCallback(()=>{
  if(view==='overview')return;
  const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{setView('overview');return true;});
  return()=>subscription.remove();
 },[view]));
 return <AccountShell onBack={view==='overview'?undefined:()=>setView('overview')} fallback="/home">{account => <TeamPeople key={id+':'+(section??'')} id={id} view={account.primaryRole==='player'&&['matches','stats'].includes(view)?'overview':view} setView={setView} manage={account.primaryRole !== 'player'} planEditable={['super_admin','club_admin','coach'].includes(account.primaryRole)} deletable={account.primaryRole==='super_admin'} />}</AccountShell>;
}
function TeamPeople({ id, view, setView, manage, planEditable, deletable }: { id: string; view:string;setView:(view:string)=>void; manage: boolean; planEditable:boolean; deletable:boolean }) {
 const [team, setTeam] = useState<{ name: string; category: string; club_id: string; clubs:{name:string;photo_path:string|null}|null } | null>(null);
 const [clubPhotoUrl,setClubPhotoUrl]=useState<string>();
 const [allowed, setAllowed] = useState(false);
 const [playersAllowed,setPlayersAllowed]=useState(false);
 const [error, setError] = useState('');
 useEffect(() => {
  let active = true;
  (async () => {
   const result = await client().from('teams').select('name,category,club_id,clubs(name,photo_path)').eq('id',id).single();
   if (result.error) throw result.error;
   const currentTeam=result.data as unknown as {name:string;category:string;club_id:string;clubs:{name:string;photo_path:string|null}|null};
   const path=currentTeam.clubs?.photo_path;
   const urls=await clubPhotoUrls(path?[path]:[]);
   const [canCreate,canCreatePlayer] = await Promise.all([creationCapability('coach',result.data.club_id,id),creationCapability('player',result.data.club_id,id)]);
   if (active) { setTeam(currentTeam); setClubPhotoUrl(urls.get(path??'')); setAllowed(canCreate); setPlayersAllowed(canCreatePlayer); }
  })().catch(reason => { if (active) setError(adminError(reason)); });
  return () => { active = false; };
 }, [id]);
 const load = useCallback((page: number, search: string) => listTeamPeople(id,[view],page,search), [id,view]);
 const accessItems=([{id:'matches',label:'Partidos',description:'Resultados, convocatorias y actas',icon:'soccer',tag:'COMPETICIÓN'},{id:'player',label:'Jugadores',description:'Toda tu plantilla',icon:'account-group-outline',tag:'PLANTILLA'},{id:'coach',label:'Entrenadores',description:'Tu cuerpo técnico',icon:'whistle-outline',tag:'STAFF'},{id:'stats',label:'Estadísticas',description:'Rendimiento del equipo',icon:'chart-bar',tag:'EVOLUCIÓN'},{id:'plan',label:'Plan del equipo',description:'Acceso y licencias',icon:'shield-star-outline',tag:'ONCEX'}] as const).filter(item=>(item.id!=='stats'&&item.id!=='matches')||manage);
 if (error) return <Text style={styles.error}>{error}</Text>;
 return <View style={styles.screen}>
  <View style={styles.teamHeader}>
   <View style={styles.teamIcon}><ClubBadge key={clubPhotoUrl??team?.club_id} url={clubPhotoUrl} name={team?.clubs?.name??'Club'} size={54}/></View>
   <View style={styles.teamCopy}><Text style={styles.eyebrow}>GESTIÓN DEL EQUIPO</Text><Text style={styles.teamName}>{team?.name??'Cargando equipo…'}</Text>{!!team?.category&&<Text style={styles.teamCategory}>{team.category}</Text>}</View>
   {manage&&<Pressable accessibilityRole="button" accessibilityLabel="Editar equipo" onPress={()=>router.push({pathname:'/manage-container',params:{kind:'team',id}})} style={({pressed})=>[styles.editButton,pressed&&styles.pressed]}><MaterialCommunityIcons name="pencil-outline" size={20} color={colors.white}/></Pressable>}
  </View>
  {view==='overview'?<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dashboard}>
   <View style={styles.introduction}><Text style={styles.dashboardTitle}>Tu zona de juego.</Text><Text style={styles.dashboardDescription}>Elige una carta para gestionar tu equipo.</Text></View>
   <View style={styles.accessGrid}>
    {accessItems.map(item=><CoachAccessCard key={item.id} clubBadgeUrl={clubPhotoUrl} title={item.label} description={item.description} category={item.tag} icon={item.icon} onPress={()=>setView(item.id)}/>)}
   </View>
  </ScrollView>:<>
  <Pressable accessibilityRole="button" onPress={()=>setView('overview')} style={({pressed})=>[styles.backToPanel,pressed&&styles.pressed]}><MaterialCommunityIcons name="arrow-left" size={18} color={colors.redBright}/><Text style={styles.backLabel}>Panel del equipo</Text><MaterialCommunityIcons name="view-grid-outline" size={17} color="#AAA0AA"/></Pressable>
  <View style={styles.workspace}>{view==='matches'?<TeamMatchesPanel teamId={id}/>:view==='stats'?(team?<PlayerRankings key={id} clubId={team.club_id} teamId={id} canOpenProfiles={manage} headerContent={<View style={styles.statsHeader}><Text style={styles.statsTitle}>{team.name}</Text><Text style={styles.statsDescription}>Ranking de los jugadores del equipo</Text></View>}/>:<Text style={styles.statsDescription}>Cargando equipo…</Text>):view==='plan'?<TeamPlanPanel id={id} editable={planEditable}/>:<HierarchyList appearance="minimal" key={view} title={view==='coach'?'Entrenadores':'Jugadores'} description={view==='coach'?'El cuerpo técnico y sus jugadores asignados.':'La plantilla de tu equipo, en un solo lugar.'} header={deletable?<DeleteHierarchyButton kind="team" id={id} fallback={team?{pathname:'/clubs/[id]',params:{id:team.club_id}}:'/clubs'}/>:undefined} load={load} empty={view === 'coach' ? 'Todavía no hay entrenadores en este equipo.' : 'Todavía no hay jugadores en este equipo.'} onSelect={item => view === 'coach' ? router.push({ pathname: '/coaches/[id]', params: { id: item.id, teamId: id } }) : router.push({ pathname: '/players/[id]', params: { id: item.id } })} onCreate={(view === 'coach' ? allowed : playersAllowed) && team ? () => router.push({ pathname: '/create-account', params: { kind: view, clubId: team.club_id, teamId: id } }) : undefined} createLabel={view==='coach'?'CREAR ENTRENADOR':'CREAR JUGADOR'} />}</View></>}</View>;
}
const styles = StyleSheet.create({
 screen:{flex:1},teamHeader:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:20,paddingTop:6,paddingBottom:22},teamIcon:{width:54,height:60,borderRadius:16,backgroundColor:'#2C0D15',borderWidth:1,borderColor:'#66202D',alignItems:'center',justifyContent:'center'},teamCopy:{flex:1,minWidth:0},eyebrow:{color:colors.redBright,fontSize:9,fontWeight:'900',letterSpacing:1.7,marginBottom:5},teamName:{color:colors.white,fontSize:23,fontWeight:'900',letterSpacing:-0.5},teamCategory:{color:'#AFADB5',fontSize:12,marginTop:4},editButton:{width:44,height:44,borderRadius:14,borderWidth:1,borderColor:'#363039',backgroundColor:'#19151C',alignItems:'center',justifyContent:'center'},pressed:{opacity:0.75},dashboard:{paddingHorizontal:20,paddingBottom:32},introduction:{marginBottom:22},dashboardTitle:{color:colors.white,fontSize:29,fontWeight:'900',letterSpacing:-0.9},dashboardDescription:{color:'#B6AEB7',fontSize:13,lineHeight:21,marginTop:8,maxWidth:320},accessGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',alignItems:'flex-start',gap:16},backToPanel:{marginHorizontal:20,marginBottom:16,minHeight:44,flexDirection:'row',alignItems:'center',gap:9},backLabel:{flex:1,color:colors.white,fontSize:13,fontWeight:'700'},workspace:{flex:1,paddingTop:22,borderTopLeftRadius:26,borderTopRightRadius:26,borderTopWidth:1,borderColor:'#34222B',backgroundColor:'rgba(10,9,13,0.94)',overflow:'hidden'},statsHeader:{marginBottom:18},statsTitle:{color:colors.white,fontSize:24,fontWeight:'900'},statsDescription:{color:'#C3BEC8',fontSize:12,marginTop:7},error:{color:colors.white,padding:22,lineHeight:22}
});
