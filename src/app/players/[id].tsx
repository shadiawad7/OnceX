import ProfilePhotoDisplay from '../../components/ProfilePhotoDisplay';
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AccountShell from '../../components/AccountShell';
import Button from '../../components/Button';
import SelectionList from '../../components/SelectionList';
import BirthDateCalendar from '../../components/BirthDateCalendar';
import { client } from '../../lib/hierarchy';
import { adminError } from '../../lib/admin';
import { colors } from '../../theme/colors';
import { birthDateInput, parseBirthDate, playerAge } from '../../lib/playerDetails';
type Details = { full_name: string; position: string; birth_date: string | null };
export default function PlayerPage() {
 const { id } = useLocalSearchParams<{ id: string }>();
 return <AccountShell>{() => <PlayerProfile key={id} id={id} />}</AccountShell>;
}
function PlayerProfile({ id }: { id: string }) {
 const [details, setDetails] = useState<Details | null>(null);
 const [birth, setBirth] = useState('');
 const [editable, setEditable] = useState(false);
 const [error, setError] = useState('');
 const [notice, setNotice] = useState('');
 const [saving, setSaving] = useState(false);
 useEffect(() => {
  let active = true;
  async function load() {
   const base = await client().from('profiles').select('full_name').eq('id',id).single();
   if (!active) return;
   if (base.error) { setError(adminError(base.error)); return; }
   const result = await client().from('profiles').select('full_name,position,birth_date').eq('id',id).single();
   if (!active) return;
   if (result.error) {
    setDetails({ full_name: base.data.full_name, position: '', birth_date: null });
    setNotice(['42703','PGRST204'].includes(result.error.code) ? 'La edición de fichas está pendiente de activar en Supabase.' : adminError(result.error));
    return;
   }
   setDetails(result.data); setBirth(birthDateInput(result.data.birth_date));
   const permission = await client().rpc('can_edit_player', { target_player: id });
   if (!active) return;
   if (permission.error) setNotice(adminError(permission.error));
   else setEditable(permission.data === true);

  }
  void load().catch(() => { if(active) setError('No se ha podido cargar la ficha. Vuelve a entrar en el jugador.'); });
  return () => { active = false; };
 }, [id]);
 function change(field: keyof Details, value: string) {
  setDetails(previous => previous ? { ...previous, [field]: value } : previous); setNotice('');
 }
 async function save() {
  if (!details || saving) return;
  const birthDate = parseBirthDate(birth);
  if (birthDate === undefined) { setError('Introduce una fecha válida DD/MM/AAAA que no sea futura.'); return; }
  if (!['Portero','Defensa','Centrocampista','Delantero'].includes(details.position)) { setError('Selecciona una de las cuatro posiciones.'); return; }
  if (!details.full_name.trim()) { setError('El nombre es obligatorio.'); return; }
  setSaving(true); setError(''); setNotice('');
  try {
   const result = await client().from('profiles').update({ ...details, full_name: details.full_name.trim(), position: details.position.trim(), birth_date: birthDate }).eq('id',id).select('id').single();
   if(result.error) setError(adminError(result.error));
   else { setDetails({ ...details, birth_date: birthDate }); setNotice('Ficha guardada.'); }
  } catch { setError('No se ha podido guardar. Comprueba la conexión y vuelve a intentarlo.'); }
  finally { setSaving(false); }
 }
 if (!details) return <View style={styles.content}>{error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.red}/>}</View>;
 const age = playerAge(parseBirthDate(birth) ?? null);
 const enabled = editable && !saving;
 return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
  <ProfilePhotoDisplay id={id} name={details.full_name}/><Text style={styles.title}>{details.full_name || 'Jugador'}</Text>
  <Text style={styles.text}>{editable ? 'Gestiona la ficha de tu jugador.' : 'Ficha del jugador'}</Text>
  <Text style={styles.label}>Nombre</Text><TextInput accessibilityLabel="Nombre del jugador" style={styles.input} value={details.full_name} onChangeText={value => change('full_name',value)} editable={enabled} maxLength={120}/>
  <Text style={styles.label}>Posición</Text><SelectionList label="Posición" value={details.position} options={['Portero','Defensa','Centrocampista','Delantero'].map(value=>({value,label:value}))} disabled={!enabled} onChange={value=>change('position',value)}/>
  <Text style={styles.label}>Fecha de nacimiento · {age === null ? 'Edad sin definir' : `${age} años`}</Text><BirthDateCalendar value={birth} onChange={value => { setBirth(value); setNotice(''); }} disabled={!enabled}/>

  {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}{!!notice && <Text style={styles.text}>{notice}</Text>}

  {editable && <Button label={saving ? 'GUARDANDO…' : 'GUARDAR FICHA'} onPress={() => { void save(); }} disabled={saving}/>}
 </ScrollView>;
}
const styles = StyleSheet.create({ content: { padding: 22, paddingBottom: 40 }, title: { color: colors.white, fontSize: 28, fontWeight: '800' }, text: { color: colors.muted, marginTop: 12, lineHeight: 22 }, error: { color: colors.redBright, marginTop: 12 }, label: { color: colors.white, marginTop: 22, marginBottom: 8 }, input: { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 14, minHeight: 48 } });
