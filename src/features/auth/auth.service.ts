import { supabase } from '../../shared/lib/supabase';
export function authClient() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}
export async function signIn(email: string, password: string) {
  const { error } = await authClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function requestPasswordReset(email: string) {
  const { error } = await authClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/actualizar-clave` });
  if (error) throw error;
}
export async function updatePassword(password: string) {
  const { error } = await authClient().auth.updateUser({ password });
  if (error) throw error;
}
