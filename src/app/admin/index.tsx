import BlendedCardBackground from '../../components/BlendedCardBackground';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import AdminShell from '../../components/AdminShell';
import { adminSections, type AdminSection } from '../../lib/admin';
import { colors } from '../../theme/colors';

export default function AdminHome() {
 return <AdminShell><ScrollView contentContainerStyle={styles.content}>
  <Text style={styles.title}>Administración ONCEX</Text>
  <Text style={styles.body}>Gestiona todos los clubes, sus equipos y cuentas desde aquí. Tu acceso es global.</Text>
  {(Object.keys(adminSections) as AdminSection[]).filter(section => section !== 'teams').map(section => <Pressable key={section} accessibilityRole="button" onPress={() => section === 'clubs' ? router.push('/clubs') : router.push({ pathname: '/admin/[section]', params: { section } })} style={styles.card}><BlendedCardBackground />
   <Text style={styles.label}>{adminSections[section].title}</Text><Text style={styles.arrow}>→</Text>
  </Pressable>)}
 </ScrollView></AdminShell>;
}
const styles = StyleSheet.create({
 content: { padding: 22, paddingTop: 0, paddingBottom: 40 },
 title: { color: colors.white, fontSize: 28, fontWeight: '800' },
 body: { color: colors.muted, lineHeight: 22, marginTop: 12, marginBottom: 24 },
 card: { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 0, borderRadius: 18, padding: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
 label: { color: colors.white, fontWeight: '700', fontSize: 16 },
 arrow: { color: colors.redBright, fontSize: 20 },
});
