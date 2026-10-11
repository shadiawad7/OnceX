import { Redirect } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import AccountPending from '../components/AccountPending';
import useAccountAccess from '../hooks/useAccountAccess';
import { colors } from '../theme/colors';
export default function Home() {
 const { account, error, retry } = useAccountAccess();
 if (!account) return <SafeAreaView style={styles.safe}><ScreenHeader fallback="/login" logoStyle={styles.logo} /><AccountPending error={error} retry={retry} /></SafeAreaView>;
 if (account.primaryRole === 'super_admin') return <Redirect href="/admin" />;
 if (account.primaryRole === 'club_admin') return <Redirect href="/dashboard/club" />;
 if (account.primaryRole === 'team_admin') return <Redirect href="/dashboard/team" />;
 if (account.primaryRole === 'coach') return <Redirect href="/dashboard/coach" />;
 return <Redirect href="/dashboard/player" />;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, logo: { width: 140, height: 65 } });
