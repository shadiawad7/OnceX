import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from './src/theme/colors';

type Screen = 'splash' | 'login' | 'roles' | 'home';
type Role = 'SUPER ADMIN' | 'CLUB ADMIN' | 'ENTRENADOR' | 'JUGADOR';

const roles: { label: Role; description: string; mark: string }[] = [
  { label: 'SUPER ADMIN', description: 'Gestiona clubes y estructura global', mark: 'SA' },
  { label: 'CLUB ADMIN', description: 'Administra equipos y temporadas', mark: 'CA' },
  { label: 'ENTRENADOR', description: 'Registra partidos y rendimiento', mark: 'EN' },
  { label: 'JUGADOR', description: 'Consulta tu evolución y posición', mark: 'JU' },
];

function Brand({ small = false }: { small?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>X</Text></View>
      <Text style={[styles.brand, small && styles.brandSmall]}>ONCEX</Text>
    </View>
  );
}

function Button({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, pressed && styles.pressed]}>
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
      {!secondary && <Text style={styles.buttonArrow}>→</Text>}
    </Pressable>
  );
}

function Splash({ onContinue }: { onContinue: () => void }) {
  useEffect(() => { const timer = setTimeout(onContinue, 1300); return () => clearTimeout(timer); }, [onContinue]);
  return <View style={styles.splash}><View style={styles.splashGlow} /><Brand /><Text style={styles.splashTag}>FÚTBOL · EVOLUCIÓN · RENDIMIENTO</Text><View style={styles.splashLine} /><Text style={styles.splashFoot}>THE PERFORMANCE PLATFORM</Text></View>;
}

function Login({ onDemo }: { onDemo: () => void }) {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.login} keyboardShouldPersistTaps="handled"><Brand small /><View style={styles.loginIntro}><Text style={styles.eyebrow}>BIENVENIDO A ONCEX</Text><Text style={styles.heading}>Tu temporada.{ '\n' }Un nuevo nivel.</Text><Text style={styles.body}>Mide, entiende y potencia el rendimiento de tu equipo.</Text></View><View style={styles.form}><Text style={styles.label}>EMAIL</Text><TextInput autoCapitalize="none" keyboardType="email-address" placeholder="tu@email.com" placeholderTextColor={colors.dim} style={styles.input} /><Text style={styles.label}>CONTRASEÑA</Text><TextInput secureTextEntry placeholder="••••••••" placeholderTextColor={colors.dim} style={styles.input} /><Button label="INICIAR SESIÓN" onPress={onDemo} /><Pressable onPress={onDemo} style={styles.forgot}><Text style={styles.forgotText}>¿Has olvidado tu contraseña?</Text></Pressable></View><View style={styles.demoCard}><Text style={styles.demoKicker}>MODO DEMO</Text><Text style={styles.demoCopy}>Explora ONCEX con un rol de prueba.</Text><Button label="ELEGIR ROL" onPress={onDemo} secondary /></View></ScrollView><StatusBar style="light" /></SafeAreaView>;
}

function Roles({ onSelect }: { onSelect: (role: Role) => void }) {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.roles}><Brand small /><View style={styles.sectionTop}><Text style={styles.eyebrow}>PRIMERA EXPERIENCIA</Text><Text style={styles.heading}>¿Quién eres?</Text><Text style={styles.body}>Selecciona un rol para descubrir la plataforma.</Text></View>{roles.map((role) => <Pressable key={role.label} onPress={() => onSelect(role.label)} style={({ pressed }) => [styles.roleCard, pressed && styles.pressed]}><View style={styles.roleMark}><Text style={styles.roleMarkText}>{role.mark}</Text></View><View style={styles.roleCopy}><Text style={styles.roleLabel}>{role.label}</Text><Text style={styles.roleDescription}>{role.description}</Text></View><Text style={styles.cardArrow}>→</Text></Pressable>)}<Text style={styles.disclaimer}>Modo demostración · Los datos son ficticios</Text></ScrollView><StatusBar style="light" /></SafeAreaView>;
}

function Home({ role }: { role: Role }) {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.home} showsVerticalScrollIndicator={false}><View style={styles.homeHeader}><View><Text style={styles.eyebrow}>MARTES, 7 OCTUBRE 2026</Text><Text style={styles.homeTitle}>Hola, Alex<Text style={{ color: colors.red }}>.</Text></Text><Text style={styles.homeSub}>{role.toLowerCase()} · Juvenil A</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>AG</Text></View></View><View style={styles.scoreCard}><View><Text style={styles.scoreLabel}>ONCEX SCORE</Text><Text style={styles.scoreValue}>87</Text><Text style={styles.scoreTrend}>↑ 4 puntos este mes</Text></View><View style={styles.rank}><Text style={styles.rankNumber}>#4</Text><Text style={styles.rankLabel}>DEL CLUB</Text></View></View><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Tu temporada</Text><Text style={styles.sectionLink}>Ver todo</Text></View><View style={styles.statsGrid}>{[['PJ','12'],['MIN','684'],['GOL','7'],['AST','5']].map(([label, value]) => <View style={styles.statCard} key={label}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>)}</View><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Próximo partido</Text><Text style={styles.sectionLink}>Calendario</Text></View><View style={styles.matchCard}><View><Text style={styles.matchMeta}>LIGA · SÁB 12 OCT · 11:30</Text><Text style={styles.matchTitle}>Juvenil A <Text style={styles.muted}>vs</Text> CD Rayo</Text><Text style={styles.matchPlace}>Ciudad Deportiva ONCEX</Text></View><View style={styles.matchBadge}><Text style={styles.matchBadgeText}>LOCAL</Text></View></View><View style={styles.insightCard}><View style={styles.insightDot} /><View style={{ flex: 1 }}><Text style={styles.insightKicker}>ONCEX INSIGHTS</Text><Text style={styles.insightText}>Tu mejor tramo llega después del minuto 60.</Text></View><Text style={styles.cardArrow}>→</Text></View></ScrollView><View style={styles.tabBar}><Tab icon="⌂" label="Inicio" active /><Tab icon="◈" label="Partidos" /><Tab icon="▦" label="Stats" /><Tab icon="♙" label="Perfil" /></View><StatusBar style="light" /></SafeAreaView>;
}

function Tab({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) { return <View style={styles.tab}><Text style={[styles.tabIcon, active && styles.tabActive]}>{icon}</Text><Text style={[styles.tabLabel, active && styles.tabActive]}>{label}</Text></View>; }

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [role, setRole] = useState<Role>('JUGADOR');
  if (screen === 'splash') return <Splash onContinue={() => setScreen('login')} />;
  if (screen === 'login') return <Login onDemo={() => setScreen('roles')} />;
  if (screen === 'roles') return <Roles onSelect={(selected) => { setRole(selected); setScreen('home'); }} />;
  return <Home role={role} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  splash: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28 },
  splashGlow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#28070B', opacity: 0.8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 26, height: 26, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', transform: [{ skewX: '-12deg' }] },
  brandMarkText: { color: colors.white, fontWeight: '900', fontSize: 18, transform: [{ skewX: '12deg' }] },
  brand: { color: colors.white, fontSize: 38, fontWeight: '900', letterSpacing: 3 },
  brandSmall: { fontSize: 25, letterSpacing: 2 },
  splashTag: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginTop: 22 },
  splashLine: { width: 42, height: 2, backgroundColor: colors.red, marginTop: 25 },
  splashFoot: { color: colors.dim, fontSize: 9, letterSpacing: 2, marginTop: 14 },
  login: { padding: 26, paddingTop: 18, paddingBottom: 35 },
  loginIntro: { marginTop: 70 },
  eyebrow: { color: colors.redBright, fontSize: 10, fontWeight: '800', letterSpacing: 1.7 },
  heading: { color: colors.white, fontSize: 36, lineHeight: 40, fontWeight: '800', letterSpacing: -1.1, marginTop: 10 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 14, maxWidth: 290 },
  form: { marginTop: 35 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 8, marginTop: 16 },
  input: { height: 53, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.white, borderRadius: 12, paddingHorizontal: 16, fontSize: 15 },
  button: { backgroundColor: colors.red, height: 54, borderRadius: 12, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, marginTop: 18 },
  buttonText: { color: colors.white, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  buttonTextSecondary: { color: colors.white },
  buttonArrow: { color: colors.white, position: 'absolute', right: 18, fontSize: 20 },
  pressed: { opacity: 0.72 },
  forgot: { alignItems: 'center', marginTop: 18 }, forgotText: { color: colors.muted, fontSize: 12 },
  demoCard: { marginTop: 43, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 22 }, demoKicker: { color: colors.white, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 }, demoCopy: { color: colors.muted, marginTop: 6, fontSize: 13 },
  roles: { padding: 26, paddingTop: 18, paddingBottom: 35 }, sectionTop: { marginTop: 65, marginBottom: 30 },
  roleCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 11 }, roleMark: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#2A0B0F', alignItems: 'center', justifyContent: 'center' }, roleMarkText: { color: colors.redBright, fontWeight: '900', fontSize: 12 }, roleCopy: { flex: 1, marginLeft: 14 }, roleLabel: { color: colors.white, fontWeight: '900', fontSize: 12, letterSpacing: 0.8 }, roleDescription: { color: colors.muted, fontSize: 12, marginTop: 5 }, cardArrow: { color: colors.redBright, fontSize: 20 }, disclaimer: { textAlign: 'center', color: colors.dim, fontSize: 11, marginTop: 20 },
  home: { padding: 22, paddingTop: 18, paddingBottom: 120 }, homeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, homeTitle: { color: colors.white, fontWeight: '800', fontSize: 31, marginTop: 9, letterSpacing: -0.8 }, homeSub: { color: colors.muted, marginTop: 5, fontSize: 12 }, avatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.white, fontWeight: '900', fontSize: 12 }, scoreCard: { backgroundColor: colors.red, borderRadius: 18, padding: 20, marginTop: 29, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden' }, scoreLabel: { color: '#FFB4B9', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, scoreValue: { color: colors.white, fontSize: 57, fontWeight: '900', lineHeight: 62, marginTop: 4 }, scoreTrend: { color: colors.white, fontSize: 11, fontWeight: '700' }, rank: { justifyContent: 'center', alignItems: 'flex-end' }, rankNumber: { color: colors.white, fontSize: 32, fontWeight: '900' }, rankLabel: { color: '#FFB4B9', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 2 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 29, marginBottom: 13 }, sectionTitle: { color: colors.white, fontSize: 18, fontWeight: '800' }, sectionLink: { color: colors.redBright, fontSize: 11, fontWeight: '800' }, statsGrid: { flexDirection: 'row', gap: 9 }, statCard: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 13, paddingVertical: 15, paddingHorizontal: 8 }, statValue: { color: colors.white, fontSize: 23, fontWeight: '900', textAlign: 'center' }, statLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', textAlign: 'center', marginTop: 5, letterSpacing: 1 }, matchCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 17, flexDirection: 'row', justifyContent: 'space-between' }, matchMeta: { color: colors.redBright, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 }, matchTitle: { color: colors.white, fontSize: 17, fontWeight: '800', marginTop: 11 }, muted: { color: colors.muted, fontWeight: '500' }, matchPlace: { color: colors.muted, fontSize: 11, marginTop: 7 }, matchBadge: { alignSelf: 'flex-start', backgroundColor: '#2A0B0F', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 }, matchBadgeText: { color: colors.redBright, fontWeight: '900', fontSize: 9 }, insightCard: { backgroundColor: colors.surfaceElevated, borderRadius: 16, marginTop: 13, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, insightDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success }, insightKicker: { color: colors.success, fontWeight: '900', fontSize: 9, letterSpacing: 1.3 }, insightText: { color: colors.white, fontSize: 13, lineHeight: 18, marginTop: 5 }, tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 82, backgroundColor: '#101215', borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 14 }, tab: { alignItems: 'center', minWidth: 60 }, tabIcon: { color: colors.dim, fontSize: 23, lineHeight: 26 }, tabLabel: { color: colors.dim, fontSize: 10, marginTop: 5, fontWeight: '700' }, tabActive: { color: colors.redBright },
});
