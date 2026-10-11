import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Button from './Button';
import { colors } from '../theme/colors';

export default function AccountPending({ error, retry }: { error: string | null; retry: () => void }) {
  return <View style={styles.container}>
    {error ? <><Text style={styles.text}>{error}</Text><Button label="REINTENTAR" onPress={retry} /><Button label="INICIAR SESIÓN" onPress={() => router.replace('/login')} secondary /></>
      : <><ActivityIndicator color={colors.red} /><Text style={styles.text}>Cargando tu cuenta…</Text></>}
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 26, gap: 16 },
  text: { color: colors.white, textAlign: 'center', lineHeight: 22 },
});
