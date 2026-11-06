import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Info, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { authMessage, loginSchema } from '../auth.schema';
import { signIn } from '../auth.service';
import { isSupabaseConfigured } from '../../../shared/lib/supabase';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordInput } from '../components/PasswordInput';

export function LoginPage() {
  const { session, loading, recovery, error: sessionError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !isSupabaseConfigured) return;
    const result = loginSchema.safeParse({ email, password });
    setError('');
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map(issue => [String(issue.path[0]), issue.message])));
      return;
    }
    setErrors({}); setPending(true);
    try { await signIn(result.data.email, result.data.password); }
    catch (error) { setError(authMessage(error)); }
    finally { setPending(false); }
  }
  if (recovery) return <Navigate to="/actualizar-clave" replace />;
  if (session && !loading) return <Navigate to="/agenda" replace />;
  return <AuthLayout><div className="login-card">
    <div className="access-icon"><ShieldCheck size={25} aria-hidden="true" /></div>
    <p className="overline">BIENVENIDA A TU ESPACIO DE TRABAJO</p>
    <h2>Inicia sesión</h2><p className="form-description">Ingresa con la cuenta asignada por tu establecimiento.</p>
    {!isSupabaseConfigured && <div className="notice" role="status"><Info size={18} aria-hidden="true" /><div><strong>Conexión pendiente</strong><p>Configura Supabase para habilitar el acceso. El diseño ya está listo para revisar.</p></div></div>}
    <form onSubmit={submit} noValidate className="auth-form" aria-busy={pending}>
      <div className="field"><label htmlFor="email">Correo institucional</label><div className="input-wrap"><Mail className="input-icon" size={18} aria-hidden="true" /><input id="email" name="email" type="email" autoComplete="username" inputMode="email" placeholder="nombre@establecimiento.pe" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} required disabled={pending} /></div>{errors.email && <p id="email-error" className="field-error">{errors.email}</p>}</div>
      <div className="field"><div className="label-row"><label htmlFor="password">Contraseña</label><Link to="/recuperar-clave">¿Olvidaste tu contraseña?</Link></div><PasswordInput id="password" name="password" autoComplete="current-password" placeholder="Ingresa tu contraseña" value={password} onChange={e => setPassword(e.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} required disabled={pending} />{errors.password && <p id="password-error" className="field-error">{errors.password}</p>}</div>
      {(error || sessionError) && <div className="error-notice" role="alert">{error || sessionError}</div>}
      <button className="button primary login-submit" type="submit" disabled={pending || loading || !isSupabaseConfigured}>{pending || loading ? <><LoaderCircle className="spin" size={18} aria-hidden="true" />Verificando acceso…</> : <>Ingresar a mi agenda<ArrowRight size={18} aria-hidden="true" /></>}</button>
    </form>
    <div className="access-help"><p>¿Necesitas una cuenta?</p><span>Solicita el acceso al administrador del establecimiento.</span></div>
    <div className="privacy-note"><LockIcon /><span>Al terminar tu jornada, cierra sesión si compartes este equipo.</span></div>
  </div></AuthLayout>;
}
function LockIcon() { return <ShieldCheck size={16} aria-hidden="true" />; }
