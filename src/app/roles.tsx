import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import useAccountAccess from '../hooks/useAccountAccess';
import AccountPending from '../components/AccountPending';
import { roleLabels } from '../lib/access';
import Button from '../components/Button';
export default function Roles() {
  const { account, error, retry } = useAccountAccess();
  if (!account) return <SafeAreaView style={styles.safe}><ScreenHeader fallback="/login" logoStyle={styles.logo} /><AccountPending error={error} retry={retry} /></SafeAreaView>;
  return <SafeAreaView style={styles.safe}><ScreenHeader fallback="/login" logoStyle={styles.logo} /><ScrollView bounces={false} overScrollMode="never" contentContainerStyle={styles.roles}><View style={styles.sectionTop}><Text style={styles.eyebrow}>TU CUENTA</Text><Text style={styles.heading}>Tus roles</Text><Text style={styles.body}>Estos permisos los asigna la administración. No se pueden elegir durante el registro.</Text></View>{account.memberships.map((membership, index) => <View key={`${membership.role_code}-${membership.club_id ?? index}`} style={styles.roleCard}><View style={styles.roleCopy}><Text style={styles.roleLabel}>{roleLabels[membership.role_code]}</Text><Text style={styles.roleDescription}>{membership.club_id ? 'Acceso limitado al club asignado' : membership.role_code === 'super_admin' ? 'Acceso a toda la plataforma' : 'Cuenta personal'}</Text></View></View>)}<Button label="ENTRAR" onPress={() => router.replace('/home')} /></ScrollView><StatusBar style="light" /></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  roles: {
    padding: 26,
    paddingTop: 0,
    paddingBottom: 35
  },
  sectionTop: {
    marginTop: 0,
    marginBottom: 30
  },
  eyebrow: {
    color: colors.redBright,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7
  },
  heading: {
    color: colors.white,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1.1,
    marginTop: 10
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
    maxWidth: 290
  },
  roleCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11
  },
  pressed: {
    opacity: 0.72
  },
  roleMark: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#2A0B0F',
    alignItems: 'center',
    justifyContent: 'center'
  },
  roleMarkText: {
    color: colors.redBright,
    fontWeight: '900',
    fontSize: 12
  },
  roleCopy: {
    flex: 1,
    marginLeft: 14
  },
  roleLabel: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8
  },
  roleDescription: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 5
  },
  cardArrow: {
    color: colors.redBright,
    fontSize: 20
  },
  disclaimer: {
    textAlign: 'center',
    color: colors.dim,
    fontSize: 11,
    marginTop: 20
  },
  logo: {
    width: 200,
    height: 80,
    paddingVertical: 0,
    marginVertical: 20,
    alignSelf: 'center'
  }
});
