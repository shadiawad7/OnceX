import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AccountShell from '../../../components/AccountShell';
import ProfilePhotoPicker from '../../../components/ProfilePhotoPicker';
import ProfilePhotoDisplay from '../../../components/ProfilePhotoDisplay';
import SelectionList from '../../../components/SelectionList';
import BirthDateCalendar from '../../../components/BirthDateCalendar';
import Button from '../../../components/Button';
import { saveProfilePhoto, type ProfilePhoto } from '../../../lib/profilePhotos';
import { client } from '../../../lib/hierarchy';
import { adminError } from '../../../lib/admin';
import { birthDateInput, parseBirthDate, playerAge } from '../../../lib/playerDetails';
import { colors } from '../../../theme/colors';
type Details = {full_name:string;position:string;birth_date:string|null};
export default function EditPlayerPage() {
 const {id}=useLocalSearchParams<{id:string}>();
 return <AccountShell allowed={['super_admin','club_admin','team_admin','coach']} fallback={{pathname:'/players/[id]',params:{id}}}>{()=> <Editor key={id} id={id}/>}</AccountShell>;
}
function Editor({id}:{id:string}) {
 const [details,setDetails]=useState<Details|null>(null);
 const [photo,setPhoto]=useState<ProfilePhoto|null>(null);
 const [birth,setBirth]=useState('');
 const [jersey,setJersey]=useState('');
 const [editable,setEditable]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 useEffect(()=> {let active=true;void (async()=> {
  const permission=await client().rpc('can_edit_player',{target_player:id});
  if(permission.error)throw permission.error;
  if(permission.data!==true)throw new Error('No tienes permiso para editar este jugador.');
  const result=await client().from('profiles').select('full_name,position,birth_date,jersey_number').eq('id',id).single();
  if(result.error)throw result.error;
  if(active){setDetails({full_name:result.data.full_name,position:result.data.position,birth_date:result.data.birth_date});setBirth(birthDateInput(result.data.birth_date));setJersey(result.data.jersey_number==null?'':String(result.data.jersey_number));setEditable(true);}
 })().catch(reason=> {if(active)setError(reason instanceof Error?reason.message:adminError(reason));});return()=>{active=false;};},[id]);
  function change(field: keyof Details, value: string) {
    setDetails(previous => previous ? { ...previous, [field]: value } : previous); setNotice('');
  }
  async function save() {
    if (!details || saving || !editable) return;
    const birthDate = parseBirthDate(birth);
    if (birthDate === undefined) { setError('Introduce una fecha válida DD/MM/AAAA que no sea futura.'); return; }
    if (!['Portero', 'Defensa', 'Centrocampista', 'Delantero'].includes(details.position)) { setError('Selecciona una de las cuatro posiciones.'); return; }
    if (!details.full_name.trim()) { setError('El nombre es obligatorio.'); return; }
    if(jersey && (!/^\d{1,2}$/.test(jersey) || Number(jersey)<1 || Number(jersey)>99)) {setError('El dorsal debe estar entre 1 y 99.');return;}
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await client().from('profiles').update({ ...details, full_name: details.full_name.trim(), position: details.position.trim(), birth_date: birthDate, jersey_number: jersey ? Number(jersey) : null }).eq('id', id).select('id').single();
      if (result.error) {setError(adminError(result.error));return;}
      setDetails({ ...details, birth_date: birthDate });
      if(photo) {
       try {await saveProfilePhoto(id,photo);}
       catch(reason) {setError(`Los datos se han guardado, pero la foto no. ${reason instanceof Error ? reason.message : 'Reintenta guardar.'}`);return;}
       setPhoto(null);
      }
      if(router.canGoBack()) router.back(); else router.replace({pathname:'/players/[id]',params:{id}});
    } catch { setError('No se ha podido guardar. Comprueba la conexión y vuelve a intentarlo.'); } finally { setSaving(false); }
  }

 if(!details)return <View style={styles.content}>{error?<Text style={styles.error}>{error}</Text>:<ActivityIndicator color={colors.red}/>}</View>;
 const enabled=editable&&!saving;
 const age=playerAge(parseBirthDate(birth)??null);
 return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><ProfilePhotoDisplay id={id} name={details.full_name}/>
    <View style={styles.editor}><Text style={styles.sectionTitle}>EDITAR FICHA</Text><ProfilePhotoPicker value={photo} onChange={value=>{setPhoto(value);setError('');setNotice('');}} disabled={saving} onError={setError}/><Text style={styles.helper}>{editable ? 'Gestiona la información personal del jugador.' : 'Ficha del jugador'}</Text><Text style={styles.label}>Nombre</Text><TextInput accessibilityLabel="Nombre del jugador" style={styles.input} value={details.full_name} onChangeText={value => change('full_name', value)} editable={enabled} maxLength={120} /><Text style={styles.label}>Dorsal</Text><TextInput accessibilityLabel="Dorsal" style={styles.input} value={jersey} onChangeText={value=>setJersey(value.replace(/\D/g,''))} keyboardType="number-pad" maxLength={2} editable={enabled}/><Text style={styles.label}>Posición</Text><SelectionList label="Posición" value={details.position} options={['Portero', 'Defensa', 'Centrocampista', 'Delantero'].map(value => ({ value, label: value }))} disabled={!enabled} onChange={value => change('position', value)} /><Text style={styles.label}>Fecha de nacimiento · {age === null ? 'Edad sin definir' : `${age} años`}</Text><BirthDateCalendar value={birth} onChange={value => { setBirth(value); setNotice(''); }} disabled={!enabled} />{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}{!!notice && <Text style={styles.helper}>{notice}</Text>}{editable && <Button label={saving ? 'GUARDANDO…' : 'GUARDAR FICHA'} onPress={() => { void save(); }} disabled={saving} />}</View>
 </ScrollView>;
}
const styles=StyleSheet.create({content:{padding:22,paddingBottom:40},editor:{paddingTop:8},sectionTitle:{color:colors.white,fontWeight:'800',fontSize:22},helper:{color:colors.muted,lineHeight:20,marginVertical:12},label:{color:colors.white,marginTop:16,marginBottom:8},input:{color:colors.white,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:10,padding:14,minHeight:48},error:{color:colors.redBright,marginTop:12}});
