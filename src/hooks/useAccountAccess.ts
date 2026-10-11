import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { loadAccountAccess, SessionRequired, type AccountAccess } from '../lib/access';

export default function useAccountAccess() {
  const [account, setAccount] = useState<AccountAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    loadAccountAccess().then(value => {
      if (active) { setAccount(value); setError(null); }
    }).catch(reason => {
      if (!active) return;
      setAccount(null);
      if (reason instanceof SessionRequired) router.replace('/login');
      else setError(reason instanceof Error ? reason.message : 'No se ha podido cargar tu cuenta.');
    });
    return () => { active = false; };
  // A retry deliberately reruns the focused request with a fresh cancellation scope.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]));
  const retry = () => { setAccount(null); setError(null); setAttempt(value => value + 1); };
  return { account, error, retry };
}
