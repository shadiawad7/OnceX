import PlayerNavigation from './PlayerNavigation';
import { useState } from 'react';
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
 const [signingOut,setSigningOut]=useState(false);
 const [logoutError,setLogoutError]=useState('');
 async function signOut() {
  if(signingOut)return;
  setSigningOut(true);setLogoutError('');
  try {
   const result=await client().auth.signOut();
   if(result.error) {setLogoutError('No se ha podido cerrar sesión. Comprueba la conexión y reintenta.');return;}
   router.replace('/login');
  } catch {setLogoutError('No se ha podido cerrar sesión. Comprueba la conexión y reintenta.');}
  finally {setSigningOut(false);}
 }
 const { account, error, retry } = useAccountAccess();
 if (account && allowed && !allowed.includes(account.primaryRole)) return <Redirect href="/home" />;
 return <SafeAreaView style={styles.safe} edges={account?.primaryRole==='player' ? ['top','left','right'] : ['top','left','right','bottom']}><ScreenHeader fallback={fallback} logoStyle={styles.logo} />
  {!account ? <AccountPending error={error} retry={retry} /> : <><View style={styles.top}><Text style={styles.badge}>{roleLabels[account.primaryRole]}</Text><Pressable accessibilityRole="button" accessibilityState={{disabled:signingOut,busy:signingOut}} disabled={signingOut} onPress={()=> {void signOut();}}><Text style={styles.logout}>{signingOut?'Cerrando sesión…':'Cerrar sesión'}</Text></Pressable></View>{!!logoutError && <Text accessibilityRole="alert" style={{color:colors.redBright,marginHorizontal:20}}>{logoutError}</Text>}<View style={{flex:1}}>{children(account)}</View>{account.primaryRole==='player'&&<PlayerNavigation/>}</>}
 </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#250A10' }, logo: { width: 140, height: 65 }, top: { flexDirection: 'row', justifyContent: 'space-between', margin: 20, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: 'rgba(20, 8, 13, 0.58)', borderWidth: 1, borderColor: 'rgba(255, 70, 82, 0.22)' }, badge: { color: colors.redBright, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, logout: { color: '#D7B7BC', fontSize: 12 } });
