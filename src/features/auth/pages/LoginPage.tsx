import { useState } from 'react';
import type { FormEvent } from 'react';
import { Info, LoaderCircle, UserRound } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { authMessage, loginSchema } from '../auth.schema';
import { signIn } from '../auth.service';
import { isSupabaseConfigured } from '../../../shared/lib/supabase';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordInput } from '../components/PasswordInput';

export function LoginPage() {
  const { session, loading, recovery, error: sessionError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !isSupabaseConfigured) return;
    const result = loginSchema.safeParse({ username, password });
    setError('');
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await signIn(result.data.username, result.data.password);
    } catch (error) {
      setError(authMessage(error));
    } finally {
      setPending(false);
    }
  }
  if (recovery) return <Navigate to="/actualizar-clave" replace />;
  if (session && !loading) return <Navigate to="/agenda" replace />;
  return (
    <AuthLayout>
      <div className="login-card">
        <h1>Iniciar sesión</h1>
        {!isSupabaseConfigured && (
          <div className="notice" role="status">
            <Info size={18} aria-hidden="true" />
            <div>
              <strong>Conexión pendiente</strong>
              <p>Solicita al administrador que configure la conexión para habilitar el acceso.</p>
            </div>
          </div>
        )}
        <form onSubmit={submit} noValidate className="auth-form" aria-busy={pending}>
          <div className="field">
            <label htmlFor="username">Usuario</label>
            <div className="input-wrap">
              <UserRound className="input-icon" size={18} aria-hidden="true" />
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? 'username-error' : undefined}
                required
                disabled={pending}
              />
            </div>
            {errors.username && (
              <p id="username-error" className="field-error">
                {errors.username}
              </p>
            )}
          </div>
          <div className="field">
            <div className="label-row">
              <label htmlFor="password">Contraseña</label>
              <Link to="/recuperar-clave">¿Olvidaste tu contraseña?</Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              required
              disabled={pending}
            />
            {errors.password && (
              <p id="password-error" className="field-error">
                {errors.password}
              </p>
            )}
          </div>
          {(error || sessionError) && (
            <div className="error-notice" role="alert">
              {error || sessionError}
            </div>
          )}
          <button
            className="button primary login-submit"
            type="submit"
            disabled={pending || loading || !isSupabaseConfigured}
          >
            {pending || loading ? (
              <>
                <LoaderCircle className="spin" size={18} aria-hidden="true" />
                Verificando acceso…
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
        <p className="login-support">Para solicitar acceso, contacta al responsable.</p>
      </div>
    </AuthLayout>
  );
}
