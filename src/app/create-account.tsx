import ProfilePhotoPicker from '../components/ProfilePhotoPicker';
import { saveProfilePhoto, type ProfilePhoto } from '../lib/profilePhotos';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import AccountShell from '../components/AccountShell';
import Button from '../components/Button';
import TeamCategoryPicker from '../components/TeamCategoryPicker';
import { createHierarchyAccount, createTeam, type ProvisionResult, type ProvisionKind } from '../lib/hierarchy';
import { colors } from '../theme/colors';
const names: Record<ProvisionKind,string> = { club: 'club', team: 'equipo', coach: 'entrenador', player: 'jugador' };
export default function CreateAccountPage() {
 const params = useLocalSearchParams<{ kind: string; clubId?: string; teamId?: string; coachId?: string }>();
 if (!['club','team','coach','player'].includes(params.kind)) return <Text>Alta no válida.</Text>;
 return <AccountShell allowed={['super_admin','club_admin','team_admin','coach']}>{() => <CreateForm key={`${params.kind}-${params.clubId}-${params.teamId}-${params.coachId}`} kind={params.kind as ProvisionKind} clubId={params.clubId} teamId={params.teamId} coachId={params.coachId} />}</AccountShell>;
}
function CreateForm({ kind, clubId, teamId, coachId }: { kind: ProvisionKind; clubId?: string; teamId?: string; coachId?: string }) {
 const [photo,setPhoto]=useState<ProfilePhoto|null>(null);
 const [created,setCreated]=useState<ProvisionResult|null>(null);
 const [name, setName] = useState(''); const [email, setEmail] = useState('');
 const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
 const [category, setCategory] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
 const submit = async () => {
  if (kind === 'team') {
   if (!name.trim() || !category || !clubId) { setError('Completa el nombre y la categoría del equipo.'); return; }
   setBusy(true); setError('');
   try { const id = await createTeam({ name, category, clubId }); router.replace({ pathname: '/teams/[id]', params: { id } }); }
   catch (reason) { setError(reason instanceof Error ? reason.message : 'No se ha podido crear el equipo.'); }
   finally { setBusy(false); }
   return;
  }
  if (!created && (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8 || password.length > 128 || password !== confirmation)) { setError('Completa el nombre y email, y confirma una contraseña de entre 8 y 128 caracteres. Selecciona la categoría si creas un equipo.'); return; }
  setBusy(true); setError('');
  try {
   const result = created ?? await createHierarchyAccount({ kind, name: name.trim(), email: email.trim().toLowerCase(), password, category, clubId, teamId, coachId });
   setCreated(result); setPassword(''); setConfirmation('');
   if(photo && (kind==='coach'||kind==='player')) await saveProfilePhoto(result.user_id,photo);
   if (kind === 'club') router.replace({ pathname: '/clubs/[id]', params: { id: result.club_id } });
   else if (kind === 'coach') router.replace({ pathname: '/coaches/[id]', params: { id: result.user_id, teamId: result.team_id! } });
   else router.replace({ pathname: '/coaches/[id]', params: { id: coachId!, teamId: teamId! } });
  } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se ha podido completar el alta.'); }
  finally { setBusy(false); }
 };
 return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
  <Text style={styles.title}>Crear {names[kind]}</Text><Text style={styles.body}>{kind === 'club' ? 'El club se crea vacío. Después podrás añadir sus equipos.' : kind === 'team' ? 'El equipo se crea sin entrenadores ni jugadores.' : 'La cuenta quedará vinculada a este equipo.'}</Text>
  <Text style={styles.body}>Nombre del {names[kind]}</Text><TextInput accessibilityLabel="Nombre" value={name} onChangeText={setName} maxLength={120} editable={!busy && !created} style={styles.input} />
  {(kind==='coach'||kind==='player') && <ProfilePhotoPicker value={photo} onChange={setPhoto} disabled={busy} onError={setError}/>}
  {kind === 'team' && <TeamCategoryPicker value={category} onChange={setCategory} disabled={busy} />}
  {kind !== 'team' && <><Text style={styles.body}>Email de acceso</Text><TextInput accessibilityLabel="Email de acceso" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" editable={!busy && !created} style={styles.input} />
  <Text style={styles.body}>Contraseña</Text><TextInput accessibilityLabel="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" editable={!busy && !created} style={styles.input} />
  <Text style={styles.body}>Confirmar contraseña</Text><TextInput accessibilityLabel="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy && !created} style={styles.input} />
  </>}
  {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
  <Button label={busy ? (created ? 'GUARDANDO FOTO…' : 'CREANDO…') : created ? 'REINTENTAR GUARDAR FOTO' : `CREAR ${names[kind].toUpperCase()}`} disabled={busy} onPress={submit} />
 </ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, content: { padding: 22, paddingTop: 0, paddingBottom: 40 }, title: { color: colors.white, fontSize: 28, fontWeight: '800' }, body: { color: colors.muted, lineHeight: 22, marginVertical: 8 }, input: { color: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 10, backgroundColor: colors.surface, padding: 14 }, error: { color: colors.redBright, marginTop: 16, lineHeight: 22 } });
