import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, ImageBackground, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import DrawnLogo from '../components/DrawnLogo';
import { supabase } from '../lib/supabase';
import { authErrorMessage } from '../lib/auth';

// Play the introduction once per app run, not on every return to login.
let loginIntroSeen = false;

export default function Login() {
  const [skipIntro] = useState(() => loginIntroSeen);
  useEffect(() => { loginIntroSeen = true; }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const signIn = async () => {
    if (signingIn) return;
    if (!email.trim() || !password) { setAuthError('Introduce tu email y contraseña.'); return; }
    if (!supabase) { setAuthError('El acceso no está disponible todavía. Inténtalo más tarde.'); return; }
    setAuthError(null);
    setSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) { setAuthError(authErrorMessage(error)); return; }
      if (data.session) {
        setPassword('');
        router.replace('/home');
      }
    } catch { setAuthError(authErrorMessage({})); }
    finally { setSigningIn(false); }
  };
const [logoOpacity] = useState(() => new Animated.Value(0));
const [drawProgress] = useState(() => new Animated.Value(0));
const [outlineOpacity] = useState(() => new Animated.Value(1));
const [originalLogoOpacity] = useState(() => new Animated.Value(0));

const { width: screenWidth, height: screenHeight } = useWindowDimensions();
const introLogoWidth = Math.min(screenWidth * 0.8, screenHeight * 1.2, 420);

const [backgroundOpacity] = useState(() => new Animated.Value(skipIntro ? 1 : 0));

const [contentOpacity] = useState(() => new Animated.Value(skipIntro ? 1 : 0));

const [contentOffset] = useState(() => new Animated.Value(skipIntro ? 0 : 18));
  const [logoExpanded, setLogoExpanded] = useState(false);
  const [originalLogoReady, setOriginalLogoReady] = useState(false);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(skipIntro ? true : null);
  const [introFinished, setIntroFinished] = useState(skipIntro);
  const contentReady = introFinished || reduceMotion === true;

  // Always restore the logo, stadium and form if an interrupted intro gets stuck.
  useEffect(() => {
    if (contentReady) return;
    const timeout = setTimeout(() => {
      setReduceMotion(true);
      setIntroFinished(true);
    }, 7500);
    return () => clearTimeout(timeout);
  }, [contentReady]);


  useEffect(() => {
    if (skipIntro) return;
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => { if (active) setReduceMotion(value); })
      .catch(() => { if (active) setReduceMotion(false); });
    return () => { active = false; };
  }, [skipIntro]);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      backgroundOpacity.setValue(1);
      contentOpacity.setValue(1);
      contentOffset.setValue(0);
      return;
    }

    if (!originalLogoReady) return;
    // Keep the complete outline visible until the original artwork has filled it.
    const logoEntrance = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(drawProgress, { toValue: 1, duration: 1750, easing: Easing.linear, useNativeDriver: false }),
      ]),
      Animated.timing(originalLogoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(outlineOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.delay(600),
    ]);
    logoEntrance.start(({ finished }) => { if (finished) setLogoExpanded(true); });
    return () => logoEntrance.stop();
  }, [reduceMotion, originalLogoReady, logoOpacity, drawProgress, outlineOpacity, originalLogoOpacity, backgroundOpacity, contentOpacity, contentOffset]);

  useEffect(() => {
    if (!backgroundReady || !logoExpanded || reduceMotion !== false) return;
    const entrance = Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(backgroundOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(contentOffset, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]);
    entrance.start(({ finished }) => { if (finished) setIntroFinished(true); });
    return () => entrance.stop();
  }, [backgroundReady, logoExpanded, reduceMotion, backgroundOpacity, logoOpacity, contentOpacity, contentOffset]);

  return (
    <View style={styles.background}>
      <Animated.View style={[styles.backgroundLayer, { opacity: backgroundOpacity }]} pointerEvents="none">
        <ImageBackground
          source={require('../../assets/login-stadium.png')}
          onLoad={() => setBackgroundReady(true)}
          onError={() => setBackgroundReady(true)}
          resizeMode="cover"
          style={styles.background}
        >
          <View pointerEvents="none" style={styles.shade} />
        </ImageBackground>
      </Animated.View>
      {!contentReady && (
        <Animated.View pointerEvents="none" style={[styles.introLogo, { opacity: logoOpacity }]}>
          <View style={{width:introLogoWidth,height:introLogoWidth*887/1786}}>
            <Animated.View style={[styles.logoLayer,{opacity:outlineOpacity}]}><DrawnLogo progress={drawProgress} width={introLogoWidth} height={introLogoWidth*887/1786}/></Animated.View>
            <Animated.View style={[styles.logoLayer,{opacity:originalLogoOpacity}]}><Image source={require('../../assets/oncex-logo.png')} resizeMode="contain" accessibilityLabel="Logo ONCEX" onLoad={()=>setOriginalLogoReady(true)} onError={()=>setOriginalLogoReady(true)} style={{width:introLogoWidth,height:introLogoWidth*887/1786}}/></Animated.View>
          </View>
        </Animated.View>
      )}
      <Animated.View
        style={[styles.safe, { opacity: contentOpacity, transform: [{ translateY: contentOffset }] }]}
        pointerEvents={contentReady ? 'auto' : 'none'}
        accessibilityElementsHidden={!contentReady}
        importantForAccessibility={contentReady ? 'auto' : 'no-hide-descendants'}
      >
        <SafeAreaView style={styles.safe}>
          <ScreenHeader transparent hideBack logoStyle={styles.logo} />
          <ScrollView
            bounces={false}
            overScrollMode="never"
            contentContainerStyle={styles.login}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.loginIntro}>
              <Text style={styles.eyebrow}>FÚTBOL · EVOLUCIÓN · RENDIMIENTO</Text>
            </View>
            <View style={styles.form}>
              <Text style={styles.heading}>Iniciar sesión</Text>
              <Text style={styles.body}>Tu temporada. Un nuevo nivel.</Text>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                value={email}
              onChangeText={setEmail}
              editable={!signingIn}
              autoComplete="email"
              autoCorrect={false}
              accessibilityLabel="Email"
              autoCapitalize="none"
                keyboardType="email-address"
                placeholder="tu@email.com"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <Text style={styles.label}>CONTRASEÑA</Text>
              <TextInput
                value={password}
              onChangeText={setPassword}
              editable={!signingIn}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Contraseña"
              secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              {authError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.authError}>{authError}</Text>}
              <Button label={signingIn ? 'ENTRANDO…' : 'INICIAR SESIÓN'} onPress={signIn} disabled={signingIn} />

              <View style={styles.demoCard}>
                <Button label="REGISTRARSE" onPress={() => router.push('/register')} secondary disabled={signingIn} />
              </View>
            </View>
          </ScrollView>
          <StatusBar style="light" />
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  background: { flex: 1, backgroundColor: colors.background },
  backgroundLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  introLogo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  shade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.18)' },
  safe: { flex: 1 },
  login: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  loginIntro: { flex: 1, minHeight: 100, alignItems: 'center' },
  eyebrow: {
    marginTop: 12,
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  form: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(9, 10, 12, 0.82)',
  },
  heading: { color: colors.white, fontSize: 27, fontWeight: '800' },
  body: { color: '#C7CAD0', fontSize: 13, lineHeight: 20, marginTop: 5 },
  label: {
    color: '#C7CAD0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(18, 20, 23, 0.8)',
    color: colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  authError: { color: '#FFB4B9', fontSize: 13, lineHeight: 20, marginTop: 16 },
  forgot: { alignItems: 'center', marginTop: 16, paddingVertical: 6 },
  forgotText: { color: '#C7CAD0', fontSize: 12 },
  demoCard: { marginTop: 18, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18 },
  demoKicker: { color: colors.white, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  demoCopy: { color: '#C7CAD0', marginTop: 5, fontSize: 12 },
  logo: { width: 160, height: 80, paddingVertical: 0, marginVertical: 0, alignSelf: 'center' },
});
