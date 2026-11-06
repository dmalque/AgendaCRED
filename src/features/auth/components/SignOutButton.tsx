import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from '../../../shared/lib/supabase';
export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    if (!supabase || pending) return;
    setPending(true); setError('');
    try { const { error } = await supabase.auth.signOut(); if (error) throw error; }
    catch { setError('No se pudo cerrar la sesión. Vuelve a intentarlo.'); }
    finally { setPending(false); }
  }
  return <div><button className="button" onClick={logout} disabled={pending}><LogOut size={16} />{pending ? 'Cerrando…' : 'Cerrar sesión'}</button>{error && <p role="alert" className="field-error">{error}</p>}</div>;
}
