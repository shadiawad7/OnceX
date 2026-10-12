import ProfilePhotoDisplay from '../../components/ProfilePhotoDisplay';
import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AccountShell from '../../components/AccountShell';
import { client } from '../../lib/hierarchy';
import { adminError } from '../../lib/admin';
import { colors } from '../../theme/colors';
import { birthDateInput, parseBirthDate, playerAge } from '../../lib/playerDetails';

type Details = { full_name: string; position: string; birth_date: string | null };
const officialStats = ['Partidos', 'Minutos', 'Goles', 'Goles en propia', 'Asistencias', 'Amarillas', 'Rojas', 'Clean Sheets'];

export default function PlayerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AccountShell>{account => <PlayerProfile key={id} id={id} viewerRole={account.primaryRole} />}</AccountShell>;
}

function PlayerProfile({ id, viewerRole }: { id: string; viewerRole: string }) {
  const [photoVersion,setPhotoVersion]=useState(0);
  const [details, setDetails] = useState<Details | null>(null);
  const [birth, setBirth] = useState('');
  const [editable, setEditable] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [jersey,setJersey]=useState('');
  const [team,setTeam]=useState<{name:string;category:string;clubs:{name:string}|null}|null>(null);

  useFocusEffect(useCallback(() => {
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
      setDetails(result.data); setPhotoVersion(value=>value+1); setBirth(birthDateInput(result.data.birth_date));
      const permission = await client().rpc('can_edit_player', { target_player: id });
      if (!active) return;
      if (permission.error) setNotice(adminError(permission.error)); else setEditable(viewerRole!=='player' && permission.data === true);
      const number=await client().from('profiles').select('jersey_number').eq('id',id).single();
      if(active&&!number.error) setJersey(number.data.jersey_number==null?'':String(number.data.jersey_number));
      const membership=await client().from('team_members').select('teams(name,category,clubs(name))').eq('user_id',id).eq('role_code','player').order('team_id').limit(1).maybeSingle();
      if(active&&!membership.error&&membership.data?.teams) setTeam(membership.data.teams as unknown as {name:string;category:string;clubs:{name:string}|null});
    }
    void load().catch(() => { if (active) setError('No se ha podido cargar la ficha. Vuelve a entrar en el jugador.'); });
    return () => { active = false; };
  }, [id,viewerRole]));

  if (!details) return <View style={styles.content}>{error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.red} />}</View>;
  const age = playerAge(parseBirthDate(birth) ?? null);
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View style={styles.eyebrow}><View style={styles.redDot} /><Text style={styles.eyebrowText}>PERFIL DE JUGADOR</Text></View>
    <View style={styles.hero}>
      <View style={styles.photoFrame}><ProfilePhotoDisplay key={photoVersion} id={id} name={details.full_name} style={{width:'100%',height:'100%',marginVertical:0,borderRadius:0}} /></View>
      <View style={styles.heroCopy}><Text style={styles.kicker}>ONCEX PLAYER CARD</Text><Text style={styles.title}>{details.full_name || 'Jugador'}</Text><Text style={styles.subtitle}>{details.position || 'Posición por definir'} · Ficha personal</Text></View>
    </View>
    <View style={styles.scoreCard}><View><Text style={styles.scoreLabel}>ONCEX SCORE</Text><Text style={styles.scoreValue}>—</Text><Text style={styles.scoreHint}>Pendiente de evaluación</Text></View><View style={styles.scoreMark}><Text style={styles.scoreMarkText}>11</Text><Text style={styles.scoreMarkLabel}>PLAYER</Text></View></View>
    <View style={styles.rankCard}><Text style={styles.sectionLabel}>POSICIÓN EN RANKINGS</Text><View style={styles.rankGrid}><Rank label="DEL CLUB" value="—" /><Rank label="EN SU POSICIÓN" value="—" /><Rank label="EN SU CATEGORÍA" value="—" /></View></View>
    <Text style={styles.sectionTitle}>DATOS DEL JUGADOR</Text>
    <View style={styles.detailsGrid}><Detail label="EQUIPO" value={team?.clubs?.name??'Sin club asignado'} subtitle={team?.name} /><Detail label="CATEGORÍA" value={team?.category??'Sin definir'} /><Detail label="DORSAL" value={jersey||'—'} /><Detail label="EDAD" value={age === null ? '—' : `${age} años`} /></View>
    <Text style={styles.sectionTitle}>ESTADÍSTICAS OFICIALES</Text>
    <View style={styles.statsGrid}>{officialStats.map(label => <View key={label} style={styles.stat}><Text style={styles.statValue}>—</Text><Text style={styles.statLabel}>{label}</Text></View>)}</View>
    <View style={styles.evolutionHeader}><Text style={styles.sectionTitle}>EVOLUCIÓN</Text><Text style={styles.muted}>ÚLTIMOS PARTIDOS</Text></View>
    <View style={styles.evolution}><View style={styles.evolutionLine}>{[0, 1, 2, 3, 4].map(item => <View key={item} style={styles.evolutionPoint} />)}</View><Text style={styles.evolutionEmpty}>La evolución aparecerá cuando se registren partidos.</Text></View>
    {editable && <Pressable accessibilityRole="button" accessibilityLabel="Editar ficha del jugador" onPress={()=>router.push({pathname:'/players/edit/[id]',params:{id}})} style={styles.editLink}><Text style={styles.editLinkText}>EDITAR FICHA</Text><Text style={styles.editArrow}>→</Text></Pressable>}
    {!editable && !!notice && <Text style={styles.helper}>{notice}</Text>}
  </ScrollView>;
}

function Rank({ label, value }: { label: string; value: string }) { return <View style={styles.rank}><Text style={styles.rankValue}>{value}</Text><Text style={styles.rankLabel}>{label}</Text></View>; }
function Detail({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text>{!!subtitle && <Text style={styles.detailSubtitle}>{subtitle}</Text>}</View>; }

const styles = StyleSheet.create({
  editLink: {flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:18,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface}, editLinkText:{color:colors.white,fontWeight:'800',fontSize:12},editArrow:{color:colors.redBright,fontSize:26},
  detailSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  content: { paddingHorizontal: 18, paddingBottom: 48 }, eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }, redDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.red }, eyebrowText: { color: colors.redBright, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, hero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 }, photoFrame: { width: 96, height: 128, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, heroCopy: { flex: 1 }, kicker: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 }, title: { color: colors.white, fontSize: 25, fontWeight: '900' }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 5 }, scoreCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 16, backgroundColor: '#271014', borderWidth: 1, borderColor: '#641B26', marginBottom: 12 }, scoreLabel: { color: colors.redBright, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, scoreValue: { color: colors.white, fontSize: 54, lineHeight: 60, fontWeight: '900' }, scoreHint: { color: colors.muted, fontSize: 11 }, scoreMark: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: colors.red, alignItems: 'center', justifyContent: 'center' }, scoreMarkText: { color: colors.redBright, fontSize: 19, fontWeight: '900' }, scoreMarkLabel: { color: colors.muted, fontSize: 7, fontWeight: '800' }, rankCard: { padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 22 }, sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, rankGrid: { flexDirection: 'row', marginTop: 14 }, rank: { flex: 1, borderLeftWidth: 1, borderColor: colors.border, paddingLeft: 10 }, rankValue: { color: colors.white, fontSize: 22, fontWeight: '900' }, rankLabel: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 4 }, sectionTitle: { color: colors.white, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginBottom: 12 }, detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }, detail: { width: '48%', padding: 13, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, detailLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: .8 }, detailValue: { color: colors.white, fontSize: 14, fontWeight: '800', marginTop: 7 }, statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }, stat: { width: '23%', minWidth: 70, paddingVertical: 12, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.surfaceElevated, alignItems: 'center' }, statValue: { color: colors.white, fontSize: 20, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 5 }, evolutionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, muted: { color: colors.muted, fontSize: 9, fontWeight: '800' }, evolution: { padding: 16, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }, evolutionLine: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.border }, evolutionPoint: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.red, borderWidth: 2, borderColor: '#4B1820' }, evolutionEmpty: { color: colors.muted, fontSize: 11, marginTop: 13 }, editor: { paddingTop: 8 }, helper: { color: colors.muted, fontSize: 12, lineHeight: 19, marginBottom: 12 }, label: { color: colors.white, fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 8 }, input: { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 14, minHeight: 48 }, error: { color: colors.redBright, marginTop: 12 }
});
