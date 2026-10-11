import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme/colors';
export default function RootLayout() {
  useEffect(() => {
    if (!supabase || Platform.OS === 'web') return;
    const auth = supabase.auth;
    const refresh = (state: string) => {
      if (state === 'active') auth.startAutoRefresh();
      else auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const subscription = AppState.addEventListener('change', refresh);
    return () => { subscription.remove(); auth.stopAutoRefresh(); };
  }, []);
  return <>
      <StatusBar style="light" />
      <Stack screenOptions={{
      headerShown: false,
      contentStyle: {
        backgroundColor: colors.background
      }
    }} />
    </>;
}
