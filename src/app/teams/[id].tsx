import TeamPlanPanel from '../../components/TeamPlanPanel';
import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, StyleSheet, View, Pressable } from 'react-native';
import AccountShell from '../../components/AccountShell';
import HierarchyList from '../../components/HierarchyList';
import { client, creationCapability, listTeamPeople } from '../../lib/hierarchy';
import { Choice } from '../../components/AdminAssignments';
import { colors } from '../../theme/colors';
import { adminError } from '../../lib/admin';
export default function TeamPage() {
 const { id } = useLocalSearchParams<{ id: string }>();
 return <AccountShell fallback="/home">{account => <TeamPeople key={id} id={id} manage={account.primaryRole !== 'player'} planEditable={['super_admin','club_admin'].includes(account.primaryRole)} />}</AccountShell>;
}
function TeamPeople({ id, manage, planEditable }: { id: string; manage: boolean; planEditable:boolean }) {
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
 return <View style={{ flex: 1 }}><View style={styles.controls}><Choice options={[{ id: 'coach', label: 'Entrenadores' }, { id: 'player', label: 'Jugadores' }, { id:'plan',label:'Plan' }]} value={view} onChange={setView} />{manage && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/manage-container', params: { kind: 'team', id } })}><Text style={styles.link}>Editar equipo</Text></Pressable>}</View>{view==='plan'?<TeamPlanPanel id={id} editable={planEditable}/>:<HierarchyList key={view} title={team?.name ?? 'Equipo'} description={`${team?.category ?? ''}\n${view === 'coach' ? 'Entra en un entrenador para ver sus jugadores.' : 'Jugadores del equipo'}`} load={load} empty={view === 'coach' ? 'Todavía no hay entrenadores en este equipo.' : 'Todavía no hay jugadores en este equipo.'} onSelect={item => view === 'coach' ? router.push({ pathname: '/coaches/[id]', params: { id: item.id, teamId: id } }) : router.push({ pathname: '/players/[id]', params: { id: item.id } })} onCreate={(view === 'coach' ? allowed : playersAllowed) && team ? () => router.push({ pathname: '/create-account', params: { kind: view, clubId: team.club_id, teamId: id } }) : undefined} createLabel={view==='coach'?'CREAR ENTRENADOR':'CREAR JUGADOR'} />}</View>;
}
const styles = StyleSheet.create({ controls: { paddingHorizontal: 22, paddingBottom: 16, gap: 12 }, link: { color: colors.redBright, paddingVertical: 8 }, error: { color: colors.white, padding: 22, lineHeight: 22 } });
