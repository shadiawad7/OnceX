import { StyleSheet, Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import ScreenHeader from './ScreenHeader';
import AccountPending from './AccountPending';
import useAccountAccess from '../hooks/useAccountAccess';
import { roleLabels, type AccountAccess, type RoleCode } from '../lib/access';
import { client } from '../lib/hierarchy';
import { colors } from '../theme/colors';
export default function AccountShell({ children, allowed, fallback = '/home' }: { children: (account: AccountAccess) => ReactNode; allowed?: RoleCode[]; fallback?: Href }) {
 const { account, error, retry } = useAccountAccess();
 if (account && allowed && !allowed.includes(account.primaryRole)) return <Redirect href="/home" />;
 return <SafeAreaView style={styles.safe}><ScreenHeader fallback={fallback} logoStyle={styles.logo} />
  {!account ? <AccountPending error={error} retry={retry} /> : <><View style={styles.top}><Text style={styles.badge}>{roleLabels[account.primaryRole]}</Text><Pressable accessibilityRole="button" onPress={async () => { const result = await client().auth.signOut(); if (result.error) { retry(); return; } router.replace('/login'); }}><Text style={styles.logout}>Cerrar sesión</Text></Pressable></View>{children(account)}</>}
 </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, logo: { width: 140, height: 65 }, top: { flexDirection: 'row', justifyContent: 'space-between', margin: 20 }, badge: { color: colors.redBright, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, logout: { color: colors.muted, fontSize: 12 } });
