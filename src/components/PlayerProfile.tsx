import { textShadow } from '../theme/textShadow';
import { loadPlayerEvolution } from '../lib/playerEvolution';
import { type OncexCardAssessment } from '../lib/oncexCard';
import PlayerEvolution from './PlayerEvolution';
import { pendingCardAssessment } from '../data/oncexCardAttributes';
import OncexCardPopup from './OncexCardPopup';
import DeleteHierarchyButton from './DeleteHierarchyButton';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import PlayerStatsPanel from './PlayerStatsPanel';
import ProfilePhotoDisplay from './ProfilePhotoDisplay';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { client } from '../lib/hierarchy';
import { adminError } from '../lib/admin';
import { colors, playerSecondaryTextColor, playerIconBackgroundColor, playerIconOpacityPercent, playerIconBorderOpacityPercent, playerColorWithOpacity } from '../theme/colors';
import { birthDateInput, parseBirthDate, playerAge } from '../lib/playerDetails';

type Details = { full_name: string; position: string; birth_date: string | null };

export default function PlayerProfile({ id, viewerRole }: { id: string; viewerRole: string }) {
  const [cardAssessment,setCardAssessment]=useState<OncexCardAssessment|null>(null);
  const [photoVersion,setPhotoVersion]=useState(0);
  const [details, setDetails] = useState<Details | null>(null);
  const [birth, setBirth] = useState('');
  const [editable, setEditable] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [jersey,setJersey]=useState('');
  const [score,setScore]=useState<number|null>(null);
  const [team,setTeam]=useState<{name:string;category:string;clubs:{name:string}|null}|null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    async function load() {
      setCardAssessment(null);
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
      const number=await client().from('profiles').select('jersey_number,oncex_score').eq('id',id).single();
      if(active&&!number.error) {setJersey(number.data.jersey_number==null?'':String(number.data.jersey_number));setScore(number.data.oncex_score??null);}
      const membership=await client().from('team_members').select('teams(name,category,clubs(name))').eq('user_id',id).eq('role_code','player').order('team_id').limit(1).maybeSingle();
      if(active&&!membership.error&&membership.data?.teams) setTeam(membership.data.teams as unknown as {name:string;category:string;clubs:{name:string}|null});
      try {
       const evolution=await loadPlayerEvolution(id);
       const rating=evolution.current;
       if(active&&evolution.status==='ready'&&rating&&rating.position===result.data.position){
        const template=pendingCardAssessment(result.data.position);
        setCardAssessment({...template,source:'calculated',modelVersion:rating.model_version,overall:rating.overall,reliability:rating.reliability,comparableCount:rating.comparable_count,attributes:template.attributes.map(attribute=>({...attribute,value:rating.attributes[attribute.code]??null}))});
       }
      } catch { /* The evolution panel reports missing migration/network errors; never fabricate ratings. */ }
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
      <View style={styles.heroCopy}><View style={styles.fichaHeading}><Text style={styles.kicker}>FICHA PERSONAL</Text></View><View accessible accessibilityLabel={details.full_name || 'Jugador'} style={styles.nameRow}>{(details.full_name.trim() || 'Jugador').split(/\s+/).map((word,index)=><Text key={`${index}-${word}`} style={[styles.title,styles.nameWord]}>{word}</Text>)}</View><View style={styles.nameUnderline}><View style={styles.nameUnderlineAccent}/><View style={styles.nameUnderlineTrail}/></View></View>
    </View>
    <View style={styles.scoreCard}><View><Text style={styles.scoreLabel}>ONCEX SCORE</Text><Text style={styles.scoreValue}>{score??0}</Text><Text style={styles.scoreHint}>{score===null?'Pendiente de evaluación':'ONCEX Score'}</Text></View><View style={styles.scoreMark}><Text style={styles.scoreMarkText}>11</Text><Text style={styles.scoreMarkLabel}>PLAYER</Text></View></View>
    <View style={styles.rankCard}><View style={styles.rankGrid}><Rank color="#22C55E" icon="soccer-field" label="POSICIÓN" value={details.position||'Sin definir'} /><Rank icon="tshirt-crew-outline" label="DORSAL" value={jersey||'—'} /><Rank color="#3B82F6" icon="shield-outline" label="EQUIPO" value={team?.clubs?.name??'Sin club asignado'} subtitle={team?.name} /><Rank color="#F6C84C" icon="calendar-account-outline" label="EDAD" value={age===null?'—':`${age} años`} /></View></View>
    <OncexCardPopup id={id} name={details.full_name} position={details.position} team={team?.name} category={team?.category} jersey={jersey} assessment={cardAssessment??pendingCardAssessment(details.position)} />
    <Text style={styles.sectionTitle}>ESTADÍSTICAS OFICIALES</Text>
    <PlayerStatsPanel playerId={id} />
    <PlayerEvolution playerId={id}/>
    {editable && <Pressable accessibilityRole="button" accessibilityLabel="Editar ficha del jugador" onPress={()=>router.push({pathname:'/players/edit/[id]',params:{id}})} style={styles.editLink}><Text style={styles.editLinkText}>EDITAR FICHA</Text><Text style={styles.editArrow}>→</Text></Pressable>}
    {viewerRole==='super_admin'&&<DeleteHierarchyButton kind="player" id={id} fallback="/clubs"/>}
    {!editable && !!notice && <Text style={styles.helper}>{notice}</Text>}
  </ScrollView>;
}

function Rank({ label, value, subtitle, icon, color = '#FFFFFF' }: { label: string; value: string; subtitle?: string; color?: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
 return <View style={styles.rank}>
  <LinearGradient pointerEvents="none" colors={['rgba(103, 19, 34, 0.68)', 'rgba(12, 5, 9, 0.4)', 'rgba(12, 5, 9, 0)']} style={styles.rankWash} />
  <View style={[styles.rankIcon, { borderColor: playerColorWithOpacity(color, playerIconBorderOpacityPercent) }]}><MaterialCommunityIcons style={styles.foregroundIcon} name={icon} size={23} color={playerColorWithOpacity(color, playerIconOpacityPercent)} /></View>
  <Text style={styles.rankLabel}>{label}</Text><Text style={styles.rankValue}>{value}</Text>
  {!!subtitle && <Text style={styles.detailSubtitle}>{subtitle}</Text>}
 </View>;
}

const styles = StyleSheet.create({
  foregroundIcon: { position: 'relative', zIndex: 1 },
  rankWash: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  rankIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FF0000', backgroundColor: playerIconBackgroundColor, marginBottom: 6 },
  editLink: {flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:18,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface}, editLinkText:{color:colors.white,fontWeight:'800',fontSize:12},editArrow:{color:colors.redBright,fontSize:26},
  detailSubtitle: { textAlign: 'center', color: playerSecondaryTextColor, fontSize: 11, lineHeight: 16, marginTop: 4 },
  content: { paddingHorizontal: 18, paddingBottom: 48 }, eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }, redDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.red }, eyebrowText: { color: colors.redBright, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 18 }, photoFrame: { width: 96, height: 128, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, heroCopy: { flex: 1, minWidth: 0, gap: 14 }, nameRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, rowGap: 2, alignItems: 'baseline' }, nameWord: { maxWidth: '100%', lineHeight: 30 }, fichaHeading: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 10, borderTopRightRadius: 10, borderBottomRightRadius: 10, backgroundColor: 'rgba(173, 22, 49, 0.16)' }, fichaAccent: { width: 18, height: 20, alignItems: 'center', justifyContent: 'center' }, fichaXForward: { position: 'absolute', width: 5, height: 20, backgroundColor: colors.redBright, transform: [{ rotate: '36deg' }], borderWidth: 0.5, borderColor: '#FF8796' }, fichaXBack: { position: 'absolute', width: 5, height: 20, backgroundColor: colors.red, transform: [{ rotate: '-36deg' }], borderWidth: 0.5, borderColor: '#FF8796' }, kicker: { flexShrink: 1, color: colors.white, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 }, title: { color: colors.white, fontSize: 25, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.4, ...textShadow('rgba(0,0,0,0.65)',4,1,2) }, nameUnderline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -6 }, nameUnderlineAccent: { width: 32, height: 3, backgroundColor: colors.redBright, transform: [{ skewX: '-25deg' }] }, nameUnderlineTrail: { width: 52, height: 1, backgroundColor: 'rgba(255,80,102,0.3)' }, subtitle: { color: playerSecondaryTextColor, fontSize: 12, marginTop: 5 }, scoreCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 16, backgroundColor: '#271014', borderWidth: 1, borderColor: '#641B26', marginBottom: 12 }, scoreLabel: { color: colors.redBright, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, scoreValue: { color: colors.white, fontSize: 54, lineHeight: 60, fontWeight: '900' }, scoreHint: { color: playerSecondaryTextColor, fontSize: 11 }, scoreMark: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: colors.red, alignItems: 'center', justifyContent: 'center' }, scoreMarkText: { color: colors.redBright, fontSize: 19, fontWeight: '900' }, scoreMarkLabel: { color: playerSecondaryTextColor, fontSize: 7, fontWeight: '800' }, rankCard: { marginBottom: 22 }, sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, rankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, teamRank: { flex: 1.5 }, rank: { flexBasis: '45%', flexGrow: 1, minWidth: 120, alignItems: 'center', padding: 16, borderTopLeftRadius: 26, borderTopRightRadius: 6, borderBottomLeftRadius: 6, borderBottomRightRadius: 26, overflow: 'hidden' }, rankValue: { textAlign: 'center', color: colors.white, fontSize: 12, lineHeight: 17, fontWeight: '800', marginTop: 7 }, rankLabel: { textAlign: 'center', color: playerSecondaryTextColor, fontSize: 9, lineHeight: 13, marginTop: 4 }, sectionTitle: { color: colors.white, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginBottom: 12 }, detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }, detail: { width: '48%', padding: 13, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, detailLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: .8 }, detailValue: { color: colors.white, fontSize: 14, fontWeight: '800', marginTop: 7 }, statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }, stat: { width: '23%', minWidth: 70, paddingVertical: 12, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.surfaceElevated, alignItems: 'center' }, statValue: { color: colors.white, fontSize: 20, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 5 }, evolutionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, muted: { color: colors.muted, fontSize: 9, fontWeight: '800' }, evolution: { padding: 16, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }, evolutionLine: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.border }, evolutionPoint: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.red, borderWidth: 2, borderColor: '#4B1820' }, evolutionEmpty: { color: colors.muted, fontSize: 11, marginTop: 13 }, editor: { paddingTop: 8 }, helper: { color: colors.muted, fontSize: 12, lineHeight: 19, marginBottom: 12 }, label: { color: colors.white, fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 8 }, input: { color: colors.white, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 14, minHeight: 48 }, error: { color: colors.redBright, marginTop: 12 }
});
