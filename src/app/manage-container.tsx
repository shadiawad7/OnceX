import SelectionList from '../components/SelectionList';
import ProfilePhotoPicker from '../components/ProfilePhotoPicker';
import { saveClubPhoto } from '../lib/clubPhotos';
import type { ProfilePhoto } from '../lib/profilePhotos';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import AccountShell from '../components/AccountShell';
import Button from '../components/Button';
import TeamCategoryPicker from '../components/TeamCategoryPicker';
import { client } from '../lib/hierarchy';
import { adminError } from '../lib/admin';
import { colors } from '../theme/colors';
import type { AccountAccess } from '../lib/access';
export default function ManageContainerPage() {
 const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
 return <AccountShell allowed={kind === 'club' ? ['super_admin'] : ['super_admin','club_admin','team_admin','coach']}>{account => <ContainerForm key={`${kind}-${id}`} kind={kind === 'club' ? 'club' : 'team'} id={id} account={account} />}</AccountShell>;
}
function ContainerForm({ kind,id,account }: { kind: 'club' | 'team'; id: string; account: AccountAccess }) {
 const [photo,setPhoto]=useState<ProfilePhoto|null>(null);
 const [ready, setReady] = useState(false); const [name, setName] = useState('');
 const [teamPlan,setTeamPlan]=useState('basic');
 const [category, setCategory] = useState(''); const [plan, setPlan] = useState<{ id: string; label: string } | null>(null);
 const [busy, setBusy] = useState(false); const [error, setError] = useState('');
 useEffect(() => {
  let active = true;
  client().from(kind === 'club' ? 'clubs' : 'teams').select(kind === 'club' ? 'name,club_subscriptions(plan_id,plans(name))' : 'name,category,plan_code').eq('id',id).single().then(result => {
   if (!active) return;
   if (result.error) setError(adminError(result.error));
   else {
    const row = result.data as unknown as { name: string; category?: string; plan_code?: string; club_subscriptions?: { plan_id: string; plans: { name: string } } | null };
    setTeamPlan(row.plan_code??'basic');
    setName(row.name); setCategory(row.category ?? '');
    if (row.club_subscriptions) setPlan({ id: row.club_subscriptions.plan_id, label: row.club_subscriptions.plans.name });
    setReady(true);
   }
  });
  return () => { active = false; };
 }, [id,kind]);
 const save = async () => {
  if (!name.trim() || (kind === 'team' && !category)) { setError('Completa el nombre y la categoría del equipo.'); return; }
  setBusy(true); setError('');
  try {
   const result = kind === 'club' ? await client().rpc('admin_save_club',{ club_name: name.trim(), target_club: id, selected_plan: plan?.id ?? null }) : await client().from('teams').update({ name: name.trim(), category, ...(['super_admin','club_admin'].includes(account.primaryRole)?{plan_code:teamPlan}:{}) }).eq('id',id).select('id').single();
   if (result.error) throw result.error;
   if(kind==='club'&&photo)await saveClubPhoto(id,photo);
   router.back();
  } catch (reason) { setError(adminError(reason)); } finally { setBusy(false); }
 };
 const remove = () => Alert.alert(`Eliminar ${name}`, 'Se eliminarán los equipos o pertenencias vinculados. Las cuentas de acceso se conservarán.', [{ text: 'Cancelar', style: 'cancel' },{ text: 'Eliminar', style: 'destructive', onPress: async () => {
  setBusy(true); setError('');
  try {
   const result = await client().from(kind === 'club' ? 'clubs' : 'teams').delete().eq('id',id).select('id').single();
   if (result.error) throw result.error;
   router.replace('/home');
  } catch (reason) { setError(adminError(reason)); } finally { setBusy(false); }
 } }]);
 return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.title}>Editar {kind === 'club' ? 'club' : 'equipo'}</Text>{error ? <Text style={styles.text}>{error}</Text> : null}{!ready ? !error && <ActivityIndicator color={colors.red} /> : <><Text style={styles.text}>Nombre</Text><TextInput accessibilityLabel="Nombre" value={name} onChangeText={setName} maxLength={120} editable={!busy} style={styles.input} />{kind === 'team' && <><TeamCategoryPicker value={category} onChange={setCategory} disabled={busy}/><Text style={styles.text}>Plan del equipo</Text><SelectionList label="Plan del equipo" value={teamPlan} options={[{value:'basic',label:'BASIC'},{value:'pro',label:'PRO'}]} onChange={setTeamPlan} disabled={busy||!['super_admin','club_admin'].includes(account.primaryRole)}/></>}{kind==='club'&&<ProfilePhotoPicker label="Escudo del club" circular aspect={[1,1]} value={photo} onChange={setPhoto} onError={setError} disabled={busy}/>}<Button label="GUARDAR" onPress={save} disabled={busy} />{account.primaryRole !== 'team_admin' && account.primaryRole !== 'coach' && <Button label="ELIMINAR" onPress={remove} disabled={busy} secondary />}</>}</ScrollView>;
}
const styles = StyleSheet.create({ content: { padding: 22, paddingTop: 0, paddingBottom: 40 }, title: { color: colors.white, fontSize: 28, fontWeight: '800' }, text: { color: colors.muted, lineHeight: 22, marginVertical: 12 }, input: { color: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, backgroundColor: colors.surface } });
