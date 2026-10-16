import ProfilePhotoDisplay from '../../components/ProfilePhotoDisplay';
import { useCallback, useState } from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AccountShell from '../../components/AccountShell';
import HierarchyList from '../../components/HierarchyList';
import { client, creationCapability, listTeamPeople } from '../../lib/hierarchy';
import type { AccountAccess } from '../../lib/access';
import { colors } from '../../theme/colors';
import { adminError } from '../../lib/admin';
export default function CoachPage() {
 const { id, teamId } = useLocalSearchParams<{ id: string; teamId: string }>();
 return <AccountShell fallback="/home">{account => <CoachPlayers key={`${id}-${teamId}`} id={id} teamId={teamId} account={account} />}</AccountShell>;
}
function CoachPlayers({ id, teamId, account }: { id: string; teamId: string; account: AccountAccess }) {
 const [coach, setCoach] = useState<{ name: string; clubId: string } | null>(null);
 const [editAllowed,setEditAllowed]=useState(false);
 const [allowed, setAllowed] = useState(false);
 const [error, setError] = useState('');
 useFocusEffect(useCallback(() => {
  let active = true;
  (async () => {
   const result = await client().from('team_members').select('club_id,profiles!team_members_profile_fk(full_name)').eq('team_id',teamId).eq('user_id',id).eq('role_code','coach').single();
   if (result.error) throw result.error;
   const record = result.data as unknown as { club_id: string; profiles: { full_name: string } };
   const canCreate = await creationCapability('player',record.club_id,teamId);
   const edit=await client().rpc('can_edit_coach_name',{target_coach:id,target_team:teamId});
   if(active)setEditAllowed(!edit.error&&edit.data===true);
   if (active) { setCoach({ name: record.profiles.full_name, clubId: record.club_id }); setAllowed(canCreate && (account.primaryRole !== 'coach' || account.userId === id)); }
  })().catch(reason => { if (active) setError(adminError(reason)); });
  return () => { active = false; };
 }, [id,teamId,account.primaryRole,account.userId]));
 const load = useCallback((page: number, search: string) => listTeamPeople(teamId,['player'],page,search,id), [teamId,id]);
 if (error) return <Text style={styles.error}>{error}</Text>;
 return <HierarchyList header={<View><ProfilePhotoDisplay id={id} name={coach?.name??'Entrenador'}/>{editAllowed&&<Pressable accessibilityRole="button" style={{paddingVertical:14}} onPress={()=>router.push({pathname:'/coaches/edit/[id]',params:{id,teamId}})}><Text style={{color:colors.redBright,fontWeight:'800'}}>EDITAR NOMBRE →</Text></Pressable>}</View>} title={coach?.name ?? 'Entrenador'} description="Jugadores de este entrenador" load={load} empty="Este entrenador todavía no tiene jugadores asignados." onSelect={item => router.push({ pathname: '/players/[id]', params: { id: item.id } })} onCreate={allowed && coach ? () => router.push({ pathname: '/create-account', params: { kind: 'player', clubId: coach.clubId, teamId, coachId: id } }) : undefined} createLabel="CREAR JUGADOR" />;
}
const styles = StyleSheet.create({ error: { color: colors.white, padding: 22, lineHeight: 22 } });
