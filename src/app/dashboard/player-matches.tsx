import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AccountShell from '../../components/AccountShell';
import { colors } from '../../theme/colors';

type Phase = 'history' | 'input' | 'review' | 'confirmed';
type EventType = 'Gol' | 'Asistencia' | 'Amarilla' | 'Cambio';
type MatchEvent = { id: number; type: EventType; player: string; minute: string; secondary?: string };

const initialEvents: MatchEvent[] = [
  { id: 1, type: 'Gol', player: 'Javier López', minute: "23'" },
  { id: 2, type: 'Asistencia', player: 'Dani Torres', minute: "23'" },
  { id: 3, type: 'Amarilla', player: 'Carlos Pérez', minute: "41'" },
  { id: 4, type: 'Cambio', player: 'Marcos Ruiz', secondary: 'Hugo Martín', minute: "60'" },
];

export default function PlayerMatches() {
  const [phase, setPhase] = useState<Phase>('history');
  const [mode, setMode] = useState<'Texto' | 'Audio'>('Texto');
  const [note, setNote] = useState('');
  const [events, setEvents] = useState(initialEvents);

  function analyze() {
    setEvents(initialEvents);
    setPhase('review');
  }

  function removeEvent(id: number) {
    setEvents(current => current.filter(event => event.id !== id));
  }

  return <AccountShell allowed={['player']}>
    {() => <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View><Text style={styles.eyebrow}>CENTRO DE PARTIDOS</Text><Text style={styles.title}>Partidos</Text><Text style={styles.subtitle}>Historial y registro inteligente</Text></View>
        <View style={styles.headerIcon}><MaterialCommunityIcons name="soccer" size={24} color={colors.redBright} /></View>
      </View>

      {phase === 'history' && <History onRegister={() => setPhase('input')} />}
      {phase === 'input' && <InputStep mode={mode} setMode={setMode} note={note} setNote={setNote} onAnalyze={analyze} onBack={() => setPhase('history')} />}
      {phase === 'review' && <ReviewStep events={events} onRemove={removeEvent} onBack={() => setPhase('input')} onConfirm={() => setPhase('confirmed')} />}
      {phase === 'confirmed' && <Confirmed onDone={() => setPhase('history')} />}
    </ScrollView>}
  </AccountShell>;
}

function History({ onRegister }: { onRegister: () => void }) {
  return <>
    <Pressable accessibilityRole="button" onPress={onRegister} style={styles.primaryButton}><MaterialCommunityIcons name="plus" size={20} color={colors.white} /><Text style={styles.primaryText}>Registrar partido</Text></Pressable>
    <Text style={styles.sectionTitle}>MIS PARTIDOS</Text>
    <MatchCard round="Jornada 1" date="12 OCT 2026" rival="Cheste" score="2 - 0" outcome="Victoria" tone="win" />
    <MatchCard round="Jornada 2" date="05 OCT 2026" rival="Atlético Turís" score="1 - 1" outcome="Empate" tone="draw" />
  </>;
}

function MatchCard({ round, date, rival, score, outcome, tone }: { round: string; date: string; rival: string; score: string; outcome: string; tone: 'win' | 'draw' | 'loss' }) {
  return <Pressable style={styles.matchCard} accessibilityRole="button" accessibilityLabel={`${round}, ONCEX contra ${rival}, ${outcome}`}>
    <View style={styles.matchTop}><Text style={styles.round}>{round}</Text><Text style={styles.date}>{date}</Text></View>
    <View style={styles.matchTeams}><View style={styles.club}><View style={styles.clubBadge}><MaterialCommunityIcons name="shield-star" size={22} color={colors.redBright} /></View><Text style={styles.clubName}>ONCEX</Text></View><View style={styles.result}><Text style={styles.score}>{score}</Text><View style={[styles.outcome, styles[`outcome_${tone}`]]}><Text style={styles.outcomeText}>{outcome}</Text></View></View><View style={styles.club}><View style={styles.rivalBadge}><MaterialCommunityIcons name="shield-outline" size={22} color={colors.muted} /></View><Text style={styles.clubName}>{rival}</Text></View></View>
    <View style={styles.matchFooter}><Text style={styles.footerText}>Tu actuación</Text><Text style={styles.footerValue}>Gol · 23&apos;</Text><MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} /></View>
  </Pressable>;
}

function InputStep({ mode, setMode, note, setNote, onAnalyze, onBack }: { mode: 'Texto' | 'Audio'; setMode: (value: 'Texto' | 'Audio') => void; note: string; setNote: (value: string) => void; onAnalyze: () => void; onBack: () => void }) {
  return <>
    <BackButton onPress={onBack} label="Volver a mis partidos" />
    <View style={styles.stepHeader}><Text style={styles.stepNumber}>01</Text><View><Text style={styles.stepTitle}>Registrar partido</Text><Text style={styles.stepHint}>Cuéntanos qué ocurrió. La IA preparará una propuesta.</Text></View></View>
    <View style={styles.toggle}><Pressable onPress={() => setMode('Texto')} style={[styles.toggleItem, mode === 'Texto' && styles.toggleActive]}><MaterialCommunityIcons name="text-box-outline" size={18} color={mode === 'Texto' ? colors.white : colors.muted} /><Text style={[styles.toggleText, mode === 'Texto' && styles.toggleTextActive]}>Texto escrito</Text></Pressable><Pressable onPress={() => setMode('Audio')} style={[styles.toggleItem, mode === 'Audio' && styles.toggleActive]}><MaterialCommunityIcons name="microphone-outline" size={18} color={mode === 'Audio' ? colors.white : colors.muted} /><Text style={[styles.toggleText, mode === 'Audio' && styles.toggleTextActive]}>Audio / voz</Text></Pressable></View>
    {mode === 'Texto' ? <TextInput multiline value={note} onChangeText={setNote} placeholder="Ej. Juvenil A ha ganado 2-0 contra Cheste..." placeholderTextColor={colors.dim} style={styles.textArea} /> : <View style={styles.audioBox}><View style={styles.audioCircle}><MaterialCommunityIcons name="microphone" size={27} color={colors.white} /></View><Text style={styles.audioTitle}>Mantén pulsado para grabar</Text><Text style={styles.audioHint}>La transcripción aparecerá aquí antes de analizarla.</Text></View>}
    <Pressable accessibilityRole="button" onPress={onAnalyze} style={styles.primaryButton}><MaterialCommunityIcons name="auto-fix" size={20} color={colors.white} /><Text style={styles.primaryText}>Analizar con IA</Text></Pressable>
  </>;
}

function ReviewStep({ events, onRemove, onBack, onConfirm }: { events: MatchEvent[]; onRemove: (id: number) => void; onBack: () => void; onConfirm: () => void }) {
  return <>
    <BackButton onPress={onBack} label="Editar entrada" />
    <View style={styles.stepHeader}><Text style={styles.stepNumber}>02</Text><View><Text style={styles.stepTitle}>Revisa el partido</Text><Text style={styles.stepHint}>Nada se guardará hasta que confirmes.</Text></View></View>
    <View style={[styles.matchPreview, styles.previewWin]}><View style={styles.previewClub}><MaterialCommunityIcons name="shield-star" size={29} color={colors.redBright} /><Text style={styles.previewTeam}>Juvenil A</Text></View><View style={styles.previewScore}><Text style={styles.previewScoreText}>2 - 0</Text><Text style={styles.previewOutcome}>VICTORIA</Text></View><View style={styles.previewClub}><MaterialCommunityIcons name="shield-outline" size={29} color={colors.muted} /><Text style={styles.previewTeam}>Cheste</Text></View></View>
    <Text style={styles.sectionTitle}>ANÁLISIS DE IA · {events.length} EVENTOS</Text>
    <View style={styles.eventList}>{events.map(event => <EventRow key={event.id} event={event} onRemove={() => onRemove(event.id)} />)}</View>
    <Pressable accessibilityRole="button" onPress={onConfirm} style={styles.primaryButton}><MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.white} /><Text style={styles.primaryText}>Confirmar partido</Text></Pressable>
  </>;
}

function EventRow({ event, onRemove }: { event: MatchEvent; onRemove: () => void }) {
  const icon = event.type === 'Gol' ? 'soccer' : event.type === 'Asistencia' ? 'shoe-cleat' : event.type === 'Amarilla' ? 'card' : 'swap-horizontal';
  const iconColor = event.type === 'Amarilla' ? '#F5D142' : event.type === 'Cambio' ? '#39E36B' : colors.redBright;
  return <View style={styles.eventRow}><View style={[styles.eventIcon, { borderColor: iconColor }]}><MaterialCommunityIcons name={icon} size={18} color={iconColor} /></View><View style={styles.eventCopy}><Text style={styles.eventType}>{event.type}</Text><Text style={styles.eventPlayer}>{event.type === 'Cambio' ? `${event.player} sale · ${event.secondary} entra` : event.player}</Text></View><Text style={styles.minute}>{event.minute}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${event.type}`} onPress={onRemove} style={styles.deleteButton}><MaterialCommunityIcons name="close" size={16} color={colors.muted} /></Pressable></View>;
}

function Confirmed({ onDone }: { onDone: () => void }) {
  return <View style={styles.confirmed}><View style={styles.successCircle}><MaterialCommunityIcons name="check" size={32} color={colors.white} /></View><Text style={styles.confirmedTitle}>Partido confirmado</Text><Text style={styles.confirmedText}>El partido y sus eventos ya forman parte de tus estadísticas oficiales.</Text><MatchCard round="Jornada 2" date="20 OCT 2026" rival="Cheste" score="2 - 0" outcome="Victoria" tone="win" /><Pressable accessibilityRole="button" onPress={onDone} style={styles.secondaryButton}><Text style={styles.secondaryText}>Volver a mis partidos</Text></Pressable></View>;
}

function BackButton({ onPress, label }: { onPress: () => void; label: string }) { return <Pressable accessibilityRole="button" onPress={onPress} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={18} color={colors.muted} /><Text style={styles.backText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 40 }, headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, eyebrow: { color: colors.redBright, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 }, title: { color: colors.white, fontSize: 30, fontWeight: '900', marginTop: 5 }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 }, headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(229,9,27,0.12)', borderWidth: 1, borderColor: 'rgba(229,9,27,0.34)', alignItems: 'center', justifyContent: 'center' }, primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: colors.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 26 }, primaryText: { color: colors.white, fontWeight: '900', fontSize: 14 }, secondaryButton: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 14 }, secondaryText: { color: colors.white, fontWeight: '800' }, sectionTitle: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginBottom: 10, marginTop: 8 }, matchCard: { backgroundColor: 'rgba(18,20,23,0.92)', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, marginBottom: 12 }, matchTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }, round: { color: colors.white, fontWeight: '900', fontSize: 12 }, date: { color: colors.dim, fontSize: 10, fontWeight: '800' }, matchTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, club: { alignItems: 'center', width: 84 }, clubBadge: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(229,9,27,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(229,9,27,0.28)' }, rivalBadge: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }, clubName: { color: colors.white, fontSize: 11, fontWeight: '800', marginTop: 7 }, result: { alignItems: 'center' }, score: { color: colors.white, fontSize: 24, fontWeight: '900' }, outcome: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, marginTop: 5 }, outcome_win: { backgroundColor: 'rgba(34,197,94,0.15)' }, outcome_draw: { backgroundColor: 'rgba(148,163,184,0.18)' }, outcome_loss: { backgroundColor: 'rgba(239,68,68,0.16)' }, outcomeText: { color: colors.white, fontSize: 10, fontWeight: '900' }, matchFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 14, paddingTop: 11 }, footerText: { flex: 1, color: colors.muted, fontSize: 11 }, footerValue: { color: colors.redBright, fontSize: 11, fontWeight: '900', marginRight: 4 }, back: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 20 }, backText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, stepHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 18 }, stepNumber: { color: colors.redBright, fontSize: 20, fontWeight: '900' }, stepTitle: { color: colors.white, fontSize: 21, fontWeight: '900' }, stepHint: { color: colors.muted, fontSize: 11, marginTop: 3 }, toggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 13, padding: 4, marginBottom: 14 }, toggleItem: { flex: 1, minHeight: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, toggleActive: { backgroundColor: colors.red }, toggleText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, toggleTextActive: { color: colors.white }, textArea: { minHeight: 155, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.white, padding: 16, textAlignVertical: 'top', fontSize: 14, lineHeight: 21, marginBottom: 14 }, audioBox: { minHeight: 205, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, audioCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, audioTitle: { color: colors.white, fontWeight: '900', fontSize: 14 }, audioHint: { color: colors.muted, fontSize: 11, marginTop: 6, textAlign: 'center', paddingHorizontal: 35 }, matchPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 14, marginBottom: 22, borderWidth: 1 }, previewWin: { backgroundColor: 'rgba(34,197,94,0.11)', borderColor: 'rgba(34,197,94,0.55)' }, previewClub: { width: 82, alignItems: 'center', gap: 6 }, previewTeam: { color: colors.white, fontSize: 11, fontWeight: '900', textAlign: 'center' }, previewScore: { alignItems: 'center' }, previewScoreText: { color: colors.white, fontSize: 22, fontWeight: '900' }, previewOutcome: { color: '#4ADE80', fontSize: 9, fontWeight: '900', marginTop: 3 }, eventList: { gap: 8, marginBottom: 18 }, eventRow: { minHeight: 62, backgroundColor: colors.surface, borderRadius: 13, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, gap: 10 }, eventIcon: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, eventCopy: { flex: 1 }, eventType: { color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }, eventPlayer: { color: colors.white, fontSize: 12, fontWeight: '800', marginTop: 3 }, minute: { color: colors.white, fontSize: 13, fontWeight: '900' }, deleteButton: { padding: 5 }, confirmed: { alignItems: 'stretch' }, successCircle: { alignSelf: 'center', width: 68, height: 68, borderRadius: 34, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginTop: 16 }, confirmedTitle: { color: colors.white, textAlign: 'center', fontSize: 23, fontWeight: '900', marginTop: 15 }, confirmedText: { color: colors.muted, textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 20 },
});
