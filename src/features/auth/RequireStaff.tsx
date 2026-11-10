import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { LoaderCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { supabase } from '../../shared/lib/supabase';
import { SignOutButton } from './components/SignOutButton';
import type { Staff } from '../../shared/types';

export type StaffProfile = Staff;
export function RequireStaff() {
  const { session, loading, recovery } = useAuth();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setProfile(null);
    setChecking(true);
    setFailed(false);
    if (!session || !supabase) {
      setChecking(false);
      return;
    }
    async function load() {
      try {
        // Verify the identity with Auth before loading the RLS-protected staff record.
        const { data: user, error: authError } = await supabase!.auth.getUser();
        if (authError || !user.user) throw new Error('Session invalid');
        const { data, error } = await supabase!
          .from('staff_profiles')
          .select('id, full_name, username, role, active')
          .eq('id', user.user.id)
          .maybeSingle();
        if (error) throw error;
        if (current) setProfile(data as StaffProfile | null);
      } catch {
        if (current) setFailed(true);
      } finally {
        if (current) setChecking(false);
      }
    }
    void load();
    return () => {
      current = false;
    };
  }, [session?.user.id, attempt]);
  if (loading)
    return (
      <div className="full-status" role="status">
        <LoaderCircle className="spin" />
        Recuperando sesión…
      </div>
    );
  if (!session) return <Navigate to="/ingresar" replace />;
  if (recovery) return <Navigate to="/actualizar-clave" replace />;
  if (checking)
    return (
      <div className="full-status" role="status">
        <LoaderCircle className="spin" />
        Verificando permisos…
      </div>
    );
  if (failed || !profile?.active || !['nurse', 'manager', 'admin'].includes(profile.role))
    return (
      <main className="full-status">
        <ShieldAlert size={36} />
        <h1>{failed ? 'No pudimos verificar el acceso' : 'Acceso pendiente de habilitación'}</h1>
        <p>
          {failed
            ? 'Revisa tu conexión o solicita al administrador que compruebe la configuración.'
            : 'Tu cuenta no tiene un perfil activo del consultorio. Contacta al responsable o administrador.'}
        </p>
        {failed && (
          <button className="button" onClick={() => setAttempt(attempt + 1)}>
            Volver a intentar
          </button>
        )}
        <SignOutButton />
      </main>
    );
  return <Outlet context={profile} />;
}
