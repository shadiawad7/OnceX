import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ONCEX</Text>

      <Text style={styles.title}>
        FÚTBOL · EVOLUCIÓN · RENDIMIENTO
      </Text>

      <Text style={styles.subtitle}>
        La nueva forma de medir tu temporada.
      </Text>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090909',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  logo: {
    color: '#e50914',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 2,
  },

  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },

  subtitle: {
    color: '#999999',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
});