import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordInput } from '../components/PasswordInput';
import { passwordSchema } from '../auth.schema';
import { updatePassword } from '../auth.service';
import { useAuth } from '../AuthProvider';

export function UpdatePasswordPage() {
  const { session, loading, finishRecovery } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    const parsed = passwordSchema.safeParse({ password, confirmation });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setPending(true);
    setError('');
    try {
      await updatePassword(parsed.data.password);
      finishRecovery();
      navigate('/agenda', { replace: true });
    } catch {
      setError('No pudimos actualizar la contraseña. Solicita otro enlace o vuelve a intentarlo.');
    } finally {
      setPending(false);
    }
  }
  return (
    <AuthLayout>
      <div className="login-card">
        <h2>Crea tu nueva contraseña</h2>
        <p className="form-description">
          Usa al menos 6 caracteres y evita reutilizar una contraseña anterior.
        </p>
        {loading ? (
          <p role="status">Verificando sesión…</p>
        ) : !session ? (
          <div className="notice">
            Inicia sesión para cambiar tu contraseña. Si la olvidaste, solicita al responsable una
            nueva clave desde Personal. <Link to="/ingresar">Volver al ingreso</Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="new-password">Nueva contraseña</label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Repetir contraseña</label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                disabled={pending}
                required
              />
            </div>
            {error && (
              <p role="alert" className="error-notice">
                {error}
              </p>
            )}
            <button className="button primary" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
