import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import Brand from '../components/Brand';
import Button from '../components/Button';
export default function Splash() {
  const {
    manual
  } = useLocalSearchParams<{
    manual?: string;
  }>();
  if (manual !== '1') return <Redirect href="/login" />;
  return <SafeAreaView style={styles.safe}><ScreenHeader root /><View style={styles.splash}><View style={styles.splashGlow} /><Brand style={styles.logo} /><Text style={styles.splashTag}>FÚTBOL · EVOLUCIÓN · RENDIMIENTO</Text><View style={styles.splashLine} /><Text style={styles.splashFoot}>THE PERFORMANCE PLATFORM</Text><Button label="CONTINUAR" onPress={() => router.push('/login')} /></View></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28
  },
  splashGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#28070B',
    opacity: 0.8
  },
  splashTag: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginTop: 0
  },
  splashLine: {
    width: 42,
    height: 2,
    backgroundColor: colors.red,
    marginTop: 25
  },
  splashFoot: {
    color: colors.dim,
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 14
  },
  logo: {
    width: 200,
    height: 80,
    paddingVertical: 0,
    marginVertical: 20,
    alignSelf: 'center'
  }
});
