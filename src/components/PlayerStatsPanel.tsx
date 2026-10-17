import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { colors, playerSecondaryTextColor, playerIconBackgroundColor, playerIconOpacityPercent, playerIconBorderOpacityPercent, playerColorWithOpacity } from '../theme/colors';

const stats = [
  { label: 'Partidos', code: 'PJ', icon: 'soccer-field', color: '#00FF66' },
  { label: 'Minutos', code: 'MIN', icon: 'timer-outline', color: '#FF8000' },
  { label: 'Goles', code: 'GOL', icon: 'soccer', color: '#FFFFFF' },
  { label: 'Goles en propia', code: 'PP', icon: 'soccer', color: '#FF0000' },
  { label: 'Asistencias', code: 'AST', icon: 'shoe-cleat', color: '#00FFFF' },
  { label: 'Amarillas', code: 'TA', icon: 'card', color: '#FFFF00' },
  { label: 'Rojas', code: 'TR', icon: 'card', color: '#FF0000' },
  { label: 'Clean Sheets', code: 'CS', icon: 'shield-check-outline', color: '#00FF66' },
] as const;

export default function PlayerStatsPanel() {
  return <View style={styles.grid}>
    {stats.map(stat => <View key={stat.code} style={styles.metric} accessible accessibilityLabel={`${stat.label}: sin datos`}>
      <LinearGradient pointerEvents="none" colors={['rgba(108, 20, 33, 0.7)', 'rgba(20, 6, 10, 0.5)', 'rgba(20, 6, 10, 0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wash} />
      <View style={styles.row}>
        <View style={[styles.medallion, { borderColor: playerColorWithOpacity(stat.color, playerIconBorderOpacityPercent) }]}><MaterialCommunityIcons style={styles.foregroundIcon} name={stat.icon} size={22} color={playerColorWithOpacity(stat.color, playerIconOpacityPercent)} /></View>
        <Text style={styles.value}>—</Text>
      </View>
      <Text style={styles.label}>{stat.label}</Text>
      <LinearGradient pointerEvents="none" colors={['rgba(255, 80, 102, 0.65)', 'rgba(255, 80, 102, 0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.baseline} />
    </View>)}
    <Text style={styles.hint}>Las estadísticas aparecerán al registrar partidos.</Text>
  </View>;
}

const styles = StyleSheet.create({
  foregroundIcon: { position: 'relative', zIndex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  metric: { flexBasis: '45%', flexGrow: 1, minWidth: 120, padding: 14, overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 6, borderBottomRightRadius: 28, borderBottomLeftRadius: 6 },
  wash: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  medallion: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#FF0000', backgroundColor: playerIconBackgroundColor, alignItems: 'center', justifyContent: 'center' },
  code: { color: '#9FCDF8', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  value: { color: colors.white, fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] },
  label: { color: '#EED1D6', fontSize: 11, fontWeight: '700', marginTop: 12, marginBottom: 10 },
  baseline: { height: 1, width: '100%' },
  hint: { color: playerSecondaryTextColor, fontSize: 11, lineHeight: 17, width: '100%' },
});
