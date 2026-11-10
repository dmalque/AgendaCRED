import { createContext, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../shared/lib/supabase';

type AuthValue = {
  session: Session | null;
  loading: boolean;
  recovery: boolean;
  finishRecovery: () => void;
  error: string | null;
};
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    // INITIAL_SESSION restores the persisted session. The listener also handles token refresh and logout.
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      setError(null);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    // Surface initialization/network errors rather than leaving the loading screen indefinitely.
    void supabase.auth
      .getSession()
      .then(({ error }) => {
        if (alive && error) {
          setError('No pudimos recuperar la sesión. Intenta ingresar nuevamente.');
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setError('No pudimos conectar con el servicio de acceso.');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{ session, loading, recovery, finishRecovery: () => setRecovery(false), error }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
