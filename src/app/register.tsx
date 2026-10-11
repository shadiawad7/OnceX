import { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabase';
import { authErrorMessage, validateRegistration } from '../lib/auth';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const register = async () => {
    if (loading || submitted) return;
    const validation = validateRegistration({ name, email, password, confirmation });
    if (validation) { setError(validation); return; }
    if (!supabase) { setError('El registro no está disponible todavía. Inténtalo más tarde.'); return; }
    setError(null);
    setLoading(true);
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (signupError) { setError(authErrorMessage(signupError)); return; }
      setPassword('');
      setConfirmation('');
      if (data.session) router.replace('/home');
      else setSubmitted(true);
    } catch { setError(authErrorMessage({})); }
    finally { setLoading(false); }
  };

  return (
    <ImageBackground source={require('../../assets/login-stadium.png')} resizeMode="cover" style={styles.background}>
      <SafeAreaView style={styles.safe}>
        <ScreenHeader fallback="/login" logoStyle={styles.logo} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView bounces={false} overScrollMode="never" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.heading}>{submitted ? 'Revisa tu correo' : 'Crea tu cuenta'}</Text>
              <Text style={styles.body}>{submitted ? 'Si tu email puede registrarse, recibirás un enlace para confirmar tu cuenta. Después podrás iniciar sesión. Si ya tienes cuenta, inicia sesión directamente.' : 'Empieza tu evolución con ONCEX.'}</Text>
              {submitted ? <Button label="VOLVER A INICIAR SESIÓN" onPress={() => router.replace('/login')} /> : (
                <>
                  <Text style={styles.label}>NOMBRE</Text>
                  <TextInput accessibilityLabel="Nombre" autoComplete="name" value={name} onChangeText={setName} editable={!loading} placeholder="Tu nombre" placeholderTextColor={colors.muted} style={styles.input} />
                  <Text style={styles.label}>EMAIL</Text>
                  <TextInput accessibilityLabel="Email" autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} editable={!loading} placeholder="tu@email.com" placeholderTextColor={colors.muted} style={styles.input} />
                  <Text style={styles.label}>CONTRASEÑA</Text>
                  <TextInput accessibilityLabel="Contraseña" autoComplete="new-password" autoCapitalize="none" autoCorrect={false} secureTextEntry value={password} onChangeText={setPassword} editable={!loading} placeholder="Mínimo 8 caracteres" placeholderTextColor={colors.muted} style={styles.input} />
                  <Text style={styles.label}>REPETIR CONTRASEÑA</Text>
                  <TextInput accessibilityLabel="Repetir contraseña" autoComplete="new-password" autoCapitalize="none" autoCorrect={false} secureTextEntry value={confirmation} onChangeText={setConfirmation} editable={!loading} placeholder="Repite tu contraseña" placeholderTextColor={colors.muted} style={styles.input} />
                  {error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
                  <Button label={loading ? 'CREANDO CUENTA…' : 'REGISTRARSE'} onPress={register} disabled={loading} />
                  <Button label="YA TENGO CUENTA" onPress={() => router.replace('/login')} secondary disabled={loading} />
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 22, width: '100%', maxWidth: 480, alignSelf: 'center' },
  card: { backgroundColor: 'rgba(9, 10, 12, 0.9)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  heading: { color: colors.white, fontSize: 28, fontWeight: '800' },
  body: { color: '#C7CAD0', fontSize: 13, lineHeight: 20, marginTop: 8 },
  label: { color: '#C7CAD0', fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginTop: 18, marginBottom: 8 },
  input: { height: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, color: colors.white, paddingHorizontal: 14, fontSize: 15 },
  error: { color: '#FFB4B9', fontSize: 13, lineHeight: 20, marginTop: 16 },
  logo: { width: 160, height: 80, marginVertical: 0, alignSelf: 'center' },
});
