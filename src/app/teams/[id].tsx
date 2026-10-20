import PlayerRankings from '../../components/PlayerRankings';
import DeleteHierarchyButton from '../../components/DeleteHierarchyButton';
import SportCardBackground from '../../components/SportCardBackground';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import TeamPlanPanel from '../../components/TeamPlanPanel';
import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, StyleSheet, View, Pressable } from 'react-native';
import AccountShell from '../../components/AccountShell';
import HierarchyList from '../../components/HierarchyList';
import { client, creationCapability, listTeamPeople } from '../../lib/hierarchy';
import { colors } from '../../theme/colors';
import { adminError } from '../../lib/admin';
export default function TeamPage() {
 const { id } = useLocalSearchParams<{ id: string }>();
 return <AccountShell fallback="/home">{account => <TeamPeople key={id} id={id} manage={account.primaryRole !== 'player'} planEditable={['super_admin','club_admin','coach'].includes(account.primaryRole)} deletable={account.primaryRole==='super_admin'} />}</AccountShell>;
}
function TeamPeople({ id, manage, planEditable, deletable }: { id: string; manage: boolean; planEditable:boolean; deletable:boolean }) {
 const [team, setTeam] = useState<{ name: string; category: string; club_id: string } | null>(null);
 const [view, setView] = useState('coach');
 const [allowed, setAllowed] = useState(false);
 const [playersAllowed,setPlayersAllowed]=useState(false);
 const [error, setError] = useState('');
 useEffect(() => {
  let active = true;
  (async () => {
   const result = await client().from('teams').select('name,category,club_id').eq('id',id).single();
   if (result.error) throw result.error;
   const [canCreate,canCreatePlayer] = await Promise.all([creationCapability('coach',result.data.club_id,id),creationCapability('player',result.data.club_id,id)]);
   if (active) { setTeam(result.data); setAllowed(canCreate); setPlayersAllowed(canCreatePlayer); }
  })().catch(reason => { if (active) setError(adminError(reason)); });
  return () => { active = false; };
 }, [id]);
 const load = useCallback((page: number, search: string) => listTeamPeople(id,[view],page,search), [id,view]);
 if (error) return <Text style={styles.error}>{error}</Text>;
 return <View style={{ flex: 1 }}><View style={styles.controls}><View style={styles.sections}>{([{id:'coach',label:'Entrenadores',icon:'whistle-outline'},{id:'player',label:'Jugadores',icon:'account-group-outline'},{id:'stats',label:'Estadísticas',icon:'chart-bar'},{id:'plan',label:'Plan',icon:'shield-star-outline'}] as const).filter(section=>section.id!=='stats'||manage).map(section=><Pressable key={section.id} accessibilityRole="tab" accessibilityState={{selected:view===section.id}} onPress={()=>setView(section.id)} style={[styles.section,view===section.id&&styles.selectedSection]}><SportCardBackground /><MaterialCommunityIcons name={section.icon} size={24} color={view===section.id?colors.redBright:colors.white}/><Text numberOfLines={1} adjustsFontSizeToFit style={styles.sectionLabel}>{section.label}</Text></Pressable>)}</View>{manage && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/manage-container', params: { kind: 'team', id } })}><Text style={styles.link}>Editar equipo</Text></Pressable>}</View>{view==='stats'?(team?<PlayerRankings key={id} clubId={team.club_id} teamId={id} canOpenProfiles={manage} headerContent={<View style={styles.statsHeader}><Text style={styles.statsTitle}>{team.name}</Text><Text style={styles.statsDescription}>Ranking de los jugadores del equipo</Text></View>}/>:<Text style={styles.statsDescription}>Cargando equipo…</Text>):view==='plan'?<TeamPlanPanel id={id} editable={planEditable}/>:<HierarchyList sporty key={view} title={team?.name ?? 'Equipo'} description={`${team?.category ?? ''}\n${view === 'coach' ? 'Entra en un entrenador para ver sus jugadores.' : 'Jugadores del equipo'}`} header={deletable?<DeleteHierarchyButton kind="team" id={id} fallback={team?{pathname:'/clubs/[id]',params:{id:team.club_id}}:'/clubs'}/>:undefined} load={load} empty={view === 'coach' ? 'Todavía no hay entrenadores en este equipo.' : 'Todavía no hay jugadores en este equipo.'} onSelect={item => view === 'coach' ? router.push({ pathname: '/coaches/[id]', params: { id: item.id, teamId: id } }) : router.push({ pathname: '/players/[id]', params: { id: item.id } })} onCreate={(view === 'coach' ? allowed : playersAllowed) && team ? () => router.push({ pathname: '/create-account', params: { kind: view, clubId: team.club_id, teamId: id } }) : undefined} createLabel={view==='coach'?'CREAR ENTRENADOR':'CREAR JUGADOR'} />}</View>;
}
const styles = StyleSheet.create({ statsHeader:{marginBottom:18},statsTitle:{color:colors.white,fontSize:24,fontWeight:'900'},statsDescription:{color:'#E2E2E6',fontSize:12,marginTop:7}, sections:{flexDirection:'row',gap:8},section:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',paddingVertical:16,paddingHorizontal:3,borderTopLeftRadius:24,borderBottomRightRadius:24,borderTopRightRadius:6,borderBottomLeftRadius:6,overflow:'hidden',borderWidth:1,borderColor:'transparent',gap:8},selectedSection:{borderColor:colors.redBright},sectionLabel:{color:colors.white,fontSize:11,fontWeight:'800',textAlign:'center'}, controls: { paddingHorizontal: 22, paddingBottom: 16, gap: 12 }, link: { color: colors.redBright, paddingVertical: 8 }, error: { color: colors.white, padding: 22, lineHeight: 22 } });
