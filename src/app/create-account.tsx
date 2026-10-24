import { checkTeamJersey, useTeamJerseyAvailability } from '../hooks/useTeamJerseyAvailability';
import { saveClubPhoto } from '../lib/clubPhotos';
import SelectionList from '../components/SelectionList';
import BirthDateCalendar from '../components/BirthDateCalendar';
import { parseBirthDate } from '../lib/playerDetails';
import { client } from '../lib/hierarchy';
import ProfilePhotoPicker from '../components/ProfilePhotoPicker';
import { saveProfilePhoto, type ProfilePhoto } from '../lib/profilePhotos';
import { useEffect, useState } from 'react';
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
 return <AccountShell allowed={['super_admin','club_admin','team_admin','coach']}>{account => <CreateForm actingCoachId={account.primaryRole==='coach'?account.userId:undefined} key={`${params.kind}-${params.clubId}-${params.teamId}-${params.coachId}`} kind={params.kind as ProvisionKind} clubId={params.clubId} teamId={params.teamId} coachId={params.coachId} />}</AccountShell>;
}
function CreateForm({ kind, clubId, teamId, coachId, actingCoachId }: { kind: ProvisionKind; clubId?: string; teamId?: string; coachId?: string; actingCoachId?: string }) {
 const [selectedCoach,setSelectedCoach]=useState(coachId??actingCoachId??'');
 const [coaches,setCoaches]=useState<{value:string;label:string}[]>([]);
 const [position,setPosition]=useState('');
 const [birth,setBirth]=useState('');
 const [jersey,setJersey]=useState('');
 const [photo,setPhoto]=useState<ProfilePhoto|null>(null);
 const [created,setCreated]=useState<ProvisionResult|null>(null);
 const jerseyCheck=useTeamJerseyAvailability(kind==='player'?teamId:undefined,jersey,created?.user_id);
 const [name, setName] = useState(''); const [email, setEmail] = useState('');
 const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
 const [category, setCategory] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
 useEffect(()=> {if(kind!=='player'||coachId||!teamId)return;let active=true;
  void (async()=> {let query=client().from('team_members').select('user_id,profiles!team_members_profile_fk(full_name)').eq('team_id',teamId).eq('role_code','coach');if(actingCoachId)query=query.eq('user_id',actingCoachId);const result=await query.order('user_id');if(result.error)throw result.error;if(active)setCoaches((result.data as unknown as {user_id:string;profiles:{full_name:string}}[]).map(row=>({value:row.user_id,label:row.profiles.full_name||'Entrenador'})));})().catch(()=>{if(active)setError('No se han podido cargar los entrenadores del equipo. Vuelve a abrir el alta.');});
  return()=>{active=false;};
 },[kind,coachId,teamId,actingCoachId]);
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
  if(kind==='player' && !selectedCoach) {setError('Selecciona un entrenador de este equipo. Si no hay ninguno, créalo primero.');return;}
  if(kind==='player' && (!photo || !position || !parseBirthDate(birth) || !/^\d{1,2}$/.test(jersey) || Number(jersey)<1 || Number(jersey)>99)) {setError('Completa la foto, posición, fecha de nacimiento y dorsal (1–99).');return;}
  if(kind==='player'&&!jerseyCheck.available){setError(jerseyCheck.message||'Comprueba el dorsal antes de continuar.');return;}
  setBusy(true); setError('');
  try {
   if(kind==='player'&&(!teamId||!await checkTeamJersey(teamId,jersey,created?.user_id)))throw new Error('Este dorsal ya está ocupado en el equipo. Elige otro número.');
   const result = created ?? await createHierarchyAccount({ kind, name: name.trim(), email: email.trim().toLowerCase(), password, category, clubId, teamId, coachId: selectedCoach || undefined });
   setCreated(result); setPassword(''); setConfirmation('');
   if(kind==='player') {
    const saved=await client().from('profiles').update({position,birth_date:parseBirthDate(birth),jersey_number:Number(jersey)}).eq('id',result.user_id).select('id').single();
    if(saved.error) throw new Error(saved.error.code==='23505'?'La cuenta está creada, pero el dorsal acaba de ocuparse. Elige otro número y reintenta guardar la ficha.':'La cuenta está creada, pero falta guardar la ficha. Comprueba la migración de altas y reintenta.');
   }
   if(photo && (kind==='coach'||kind==='player')) await saveProfilePhoto(result.user_id,photo);
   if(photo && kind==='club') await saveClubPhoto(result.club_id,photo);
   if (kind === 'club') router.replace({ pathname: '/clubs/[id]', params: { id: result.club_id } });
   else if (kind === 'coach') router.replace({ pathname: '/coaches/[id]', params: { id: result.user_id, teamId: result.team_id! } });
   else router.replace({ pathname: '/coaches/[id]', params: { id: selectedCoach, teamId: teamId! } });
  } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se ha podido completar el alta.'); }
  finally { setBusy(false); }
 };
 return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
  <Text style={styles.title}>Crear {names[kind]}</Text><Text style={styles.body}>{kind === 'club' ? 'El club se crea vacío. Después podrás añadir sus equipos.' : kind === 'team' ? 'El equipo se crea sin entrenadores ni jugadores.' : 'La cuenta quedará vinculada a este equipo.'}</Text>
  <Text style={styles.body}>Nombre del {names[kind]}</Text><TextInput accessibilityLabel="Nombre" value={name} onChangeText={setName} maxLength={120} editable={!busy && !created} style={styles.input} />
  {(kind==='coach'||kind==='player'||kind==='club') && <ProfilePhotoPicker label={kind==='club'?'Foto del club (opcional)':'Foto de perfil'} circular={kind==='club'} aspect={kind==='club'?[1,1]:[3,4]} value={photo} onChange={setPhoto} disabled={busy} onError={setError}/>}
  {kind==='player' && !coachId && <><Text style={styles.body}>Entrenador responsable</Text><SelectionList label="Entrenador del equipo" value={selectedCoach} options={coaches} onChange={setSelectedCoach} disabled={busy||!!created}/></>}
  {kind==='player' && <><Text style={styles.body}>Posición</Text><SelectionList label="Posición" value={position} options={['Portero','Defensa','Centrocampista','Delantero'].map(value=>({value,label:value}))} onChange={setPosition} disabled={busy}/><Text style={styles.body}>Fecha de nacimiento</Text><BirthDateCalendar value={birth} onChange={setBirth} disabled={busy}/><Text style={styles.body}>Dorsal</Text><TextInput accessibilityLabel="Dorsal del jugador" value={jersey} onChangeText={value=>setJersey(value.replace(/\D/g,''))} keyboardType="number-pad" maxLength={2} editable={!busy} style={[styles.input,!!jerseyCheck.message&&!jerseyCheck.checking&&{borderColor:colors.redBright}]}/>{!!jerseyCheck.message&&<Text accessibilityLiveRegion="polite" style={jerseyCheck.checking?styles.body:styles.error}>{jerseyCheck.message}</Text>}</>}
  {kind === 'team' && <><TeamCategoryPicker value={category} onChange={setCategory} disabled={busy}/><Text style={styles.body}>ONCEX · Todas las funcionalidades incluidas.</Text></>}
  {kind !== 'team' && <><Text style={styles.body}>Email de acceso</Text><TextInput accessibilityLabel="Email de acceso" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" editable={!busy && !created} style={styles.input} />
  <Text style={styles.body}>Contraseña</Text><TextInput accessibilityLabel="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" editable={!busy && !created} style={styles.input} />
  <Text style={styles.body}>Confirmar contraseña</Text><TextInput accessibilityLabel="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy && !created} style={styles.input} />
  </>}
  {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
  <Button label={busy ? (created ? 'GUARDANDO FICHA…' : 'CREANDO…') : created ? 'REINTENTAR GUARDAR FICHA' : `CREAR ${names[kind].toUpperCase()}`} disabled={busy||(kind==='player'&&!jerseyCheck.available)} onPress={submit} />
 </ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, content: { padding: 22, paddingTop: 0, paddingBottom: 40 }, title: { color: colors.white, fontSize: 28, fontWeight: '800' }, body: { color: colors.muted, lineHeight: 22, marginVertical: 8 }, input: { color: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 10, backgroundColor: colors.surface, padding: 14 }, error: { color: colors.redBright, marginTop: 16, lineHeight: 22 } });
