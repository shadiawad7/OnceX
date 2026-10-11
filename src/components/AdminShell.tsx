import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, type Href } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import type { ReactNode } from 'react';
import ScreenHeader from './ScreenHeader';
import AccountPending from './AccountPending';
import useAccountAccess from '../hooks/useAccountAccess';
import { colors } from '../theme/colors';

export default function AdminShell({ children, fallback = '/login' }: { children: ReactNode; fallback?: Href }) {
 const { account, error, retry } = useAccountAccess();
 if (account && account.primaryRole !== 'super_admin') return <Redirect href="/home" />;
 return <SafeAreaView style={styles.safe}>
  <ScreenHeader fallback={fallback} logoStyle={styles.logo} />
  {!account ? <AccountPending error={error} retry={retry} /> : <><Text style={styles.badge}>SUPER ADMIN · TODA LA PLATAFORMA</Text>{children}</>}
 </SafeAreaView>;
}
const styles = StyleSheet.create({
 safe: { flex: 1, backgroundColor: colors.background },
 logo: { width: 140, height: 65 },
 badge: { color: colors.redBright, fontWeight: '800', fontSize: 10, letterSpacing: 1, margin: 20 },
});
