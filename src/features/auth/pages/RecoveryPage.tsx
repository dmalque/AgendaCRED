import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { emailSchema } from '../auth.schema';
import { requestPasswordReset } from '../auth.service';
import { isSupabaseConfigured } from '../../../shared/lib/supabase';

export function RecoveryPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending || !isSupabaseConfigured) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setPending(true); setError('');
    try { await requestPasswordReset(parsed.data); setSent(true); }
    catch { setError('No pudimos procesar la solicitud. Espera unos minutos y vuelve a intentarlo.'); }
    finally { setPending(false); }
  }
  return <AuthLayout><div className="login-card"><Link className="back-link" to="/ingresar"><ArrowLeft size={16} />Volver al inicio de sesión</Link><div className="access-icon">{sent ? <CheckCircle2 size={25} /> : <Mail size={25} />}</div><h2>{sent ? 'Revisa tu correo' : 'Recupera tu acceso'}</h2><p className="form-description">{sent ? 'Si existe una cuenta habilitada con ese correo, recibirás instrucciones para cambiar tu contraseña. Revisa también la carpeta de spam.' : 'Te enviaremos un enlace para crear una nueva contraseña.'}</p>
    {!sent && <form onSubmit={submit} noValidate className="auth-form"><div className="field"><label htmlFor="recovery-email">Correo institucional</label><input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={pending} /></div>{error && <p className="error-notice" role="alert">{error}</p>}{!isSupabaseConfigured && <p className="notice">Configura Supabase para habilitar la recuperación.</p>}<button className="button primary" disabled={pending || !isSupabaseConfigured}>{pending ? 'Enviando…' : 'Enviar enlace de recuperación'}</button></form>}
    <p className="privacy-note">Por seguridad, el enlace debe abrirse en este mismo navegador.</p>
  </div></AuthLayout>;
}
