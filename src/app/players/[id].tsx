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
const officialStats = ['Partidos', 'Minutos', 'Goles', 'Goles en propia', 'Asistencias', 'Amarillas', 'Rojas', 'Clean Sheets'];

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
      const base = await client().from('profiles').select('full_name').eq('id', id).single();
      if (!active) return;
      if (base.error) { setError(adminError(base.error)); return; }
      const result = await client().from('profiles').select('full_name,position,birth_date').eq('id', id).single();
      if (!active) return;
      if (result.error) {
        setDetails({ full_name: base.data.full_name, position: '', birth_date: null });
        setNotice(['42703', 'PGRST204'].includes(result.error.code) ? 'La edición de fichas está pendiente de activar en Supabase.' : adminError(result.error));
        return;
      }
      setDetails(result.data); setBirth(birthDateInput(result.data.birth_date));
      const permission = await client().rpc('can_edit_player', { target_player: id });
      if (!active) return;
      if (permission.error) setNotice(adminError(permission.error)); else setEditable(permission.data === true);
    }
    void load().catch(() => { if (active) setError('No se ha podido cargar la ficha. Vuelve a entrar en el jugador.'); });
    return () => { active = false; };
  }, [id]);

  function change(field: keyof Details, value: string) {
    setDetails(previous => previous ? { ...previous, [field]: value } : previous); setNotice('');
  }
  async function save() {
    if (!details || saving) return;
    const birthDate = parseBirthDate(birth);
    if (birthDate === undefined) { setError('Introduce una fecha válida DD/MM/AAAA que no sea futura.'); return; }
    if (!['Portero', 'Defensa', 'Centrocampista', 'Delantero'].includes(details.position)) { setError('Selecciona una de las cuatro posiciones.'); return; }
    if (!details.full_name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await client().from('profiles').update({ ...details, full_name: details.full_name.trim(), position: details.position.trim(), birth_date: birthDate }).eq('id', id).select('id').single();
      if (result.error) setError(adminError(result.error)); else { setDetails({ ...details, birth_date: birthDate }); setNotice('Ficha guardada.'); }
    } catch { setError('No se ha podido guardar. Comprueba la conexión y vuelve a intentarlo.'); } finally { setSaving(false); }
  }

  if (!details) return <View style={styles.content}>{error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.red} />}</View>;
  const age = playerAge(parseBirthDate(birth) ?? null);
  const enabled = editable && !saving;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View style={styles.eyebrow}><View style={styles.redDot} /><Text style={styles.eyebrowText}>PERFIL DE JUGADOR</Text></View>
    <View style={styles.hero}>
      <View style={styles.photoFrame}><ProfilePhotoDisplay id={id} name={details.full_name} /></View>
      <View style={styles.heroCopy}><Text style={styles.kicker}>ONCEX PLAYER CARD</Text><Text style={styles.title}>{details.full_name || 'Jugador'}</Text><Text style={styles.subtitle}>{details.position || 'Posición por definir'} · Ficha personal</Text></View>
    </View>
    <View style={styles.scoreCard}><View><Text style={styles.scoreLabel}>ONCEX SCORE</Text><Text style={styles.scoreValue}>—</Text><Text style={styles.scoreHint}>Pendiente de evaluación</Text></View><View style={styles.scoreMark}><Text style={styles.scoreMarkText}>11</Text><Text style={styles.scoreMarkLabel}>PLAYER</Text></View></View>
    <View style={styles.rankCard}><Text style={styles.sectionLabel}>POSICIÓN EN RANKINGS</Text><View style={styles.rankGrid}><Rank label="DEL CLUB" value="—" /><Rank label="EN SU POSICIÓN" value="—" /><Rank label="EN SU CATEGORÍA" value="—" /></View></View>
    <Text style={styles.sectionTitle}>DATOS DEL JUGADOR</Text>
    <View style={styles.detailsGrid}><Detail label="EQUIPO" value="Pendiente" /><Detail label="CATEGORÍA" value="Pendiente" /><Detail label="DORSAL" value="—" /><Detail label="EDAD" value={age === null ? '—' : `${age} años`} /></View>
    <Text style={styles.sectionTitle}>ESTADÍSTICAS OFICIALES</Text>
    <View style={styles.statsGrid}>{officialStats.map(label => <View key={label} style={styles.stat}><Text style={styles.statValue}>—</Text><Text style={styles.statLabel}>{label}</Text></View>)}</View>
    <View style={styles.evolutionHeader}><Text style={styles.sectionTitle}>EVOLUCIÓN</Text><Text style={styles.muted}>ÚLTIMOS PARTIDOS</Text></View>
    <View style={styles.evolution}><View style={styles.evolutionLine}>{[0, 1, 2, 3, 4].map(item => <View key={item} style={styles.evolutionPoint} />)}</View><Text style={styles.evolutionEmpty}>La evolución aparecerá cuando se registren partidos.</Text></View>
    <View style={styles.editor}><Text style={styles.sectionTitle}>EDITAR FICHA</Text><Text style={styles.helper}>{editable ? 'Gestiona la información personal del jugador.' : 'Ficha del jugador'}</Text><Text style={styles.label}>Nombre</Text><TextInput accessibilityLabel="Nombre del jugador" style={styles.input} value={details.full_name} onChangeText={value => change('full_name', value)} editable={enabled} maxLength={120} /><Text style={styles.label}>Posición</Text><SelectionList label="Posición" value={details.position} options={['Portero', 'Defensa', 'Centrocampista', 'Delantero'].map(value => ({ value, label: value }))} disabled={!enabled} onChange={value => change('position', value)} /><Text style={styles.label}>Fecha de nacimiento · {age === null ? 'Edad sin definir' : `${age} años`}</Text><BirthDateCalendar value={birth} onChange={value => { setBirth(value); setNotice(''); }} disabled={!enabled} />{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}{!!notice && <Text style={styles.helper}>{notice}</Text>}{editable && <Button label={saving ? 'GUARDANDO…' : 'GUARDAR FICHA'} onPress={() => { void save(); }} disabled={saving} />}</View>
  </ScrollView>;
}

function Rank({ label, value }: { label: string; value: string }) { return <View style={styles.rank}><Text style={styles.rankValue}>{value}</Text><Text style={styles.rankLabel}>{label}</Text></View>; }
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 48 }, eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }, redDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.red }, eyebrowText: { color: colors.redBright, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, hero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 }, photoFrame: { width: 94, height: 112, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, heroCopy: { flex: 1 }, kicker: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 }, title: { color: colors.white, fontSize: 25, fontWeight: '900' }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 5 }, scoreCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 16, backgroundColor: '#271014', borderWidth: 1, borderColor: '#641B26', marginBottom: 12 }, scoreLabel: { color: colors.redBright, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, scoreValue: { color: colors.white, fontSize: 54, lineHeight: 60, fontWeight: '900' }, scoreHint: { color: colors.muted, fontSize: 11 }, scoreMark: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: colors.red, alignItems: 'center', justifyContent: 'center' }, scoreMarkText: { color: colors.redBright, fontSize: 19, fontWeight: '900' }, scoreMarkLabel: { color: colors.muted, fontSize: 7, fontWeight: '800' }, rankCard: { padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 22 }, sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, rankGrid: { flexDirection: 'row', marginTop: 14 }, rank: { flex: 1, borderLeftWidth: 1, borderColor: colors.border, paddingLeft: 10 }, rankValue: { color: colors.white, fontSize: 22, fontWeight: '900' }, rankLabel: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 4 }, sectionTitle: { color: colors.white, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginBottom: 12 }, detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }, detail: { width: '48%', padding: 13, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, detailLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: .8 }, detailValue: { color: colors.white, fontSize: 14, fontWeight: '800', marginTop: 7 }, statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }, stat: { width: '23%', minWidth: 70, paddingVertical: 12, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.surfaceElevated, alignItems: 'center' }, statValue: { color: colors.white, fontSize: 20, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 5 }, evolutionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, muted: { color: colors.muted, fontSize: 9, fontWeight: '800' }, evolution: { padding: 16, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }, evolutionLine: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.border }, evolutionPoint: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.red, borderWidth: 2, borderColor: '#4B1820' }, evolutionEmpty: { color: colors.muted, fontSize: 11, marginTop: 13 }, editor: { paddingTop: 8 }, helper: { color: colors.muted, fontSize: 12, lineHeight: 19, marginBottom: 12 }, label: { color: colors.white, fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 8 }, input: { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 14, minHeight: 48 }, error: { color: colors.redBright, marginTop: 12 }
});
