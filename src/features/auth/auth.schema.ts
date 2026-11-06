import { z } from 'zod';
export const emailSchema = z.string().trim().toLowerCase().email('Ingresa un correo electrónico válido.');
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Ingresa tu contraseña.') });
export const passwordSchema = z.object({
  password: z.string().min(12, 'Usa al menos 12 caracteres.').max(128, 'Usa como máximo 128 caracteres.'),
  confirmation: z.string(),
}).refine(value => value.password === value.confirmation, { path: ['confirmation'], message: 'Las contraseñas no coinciden.' });

export function authMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (['over_request_rate_limit', 'over_email_send_rate_limit'].includes(code)) return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  if (code === 'email_not_confirmed') return 'Tu correo aún no está confirmado. Consulta al administrador.';
  if (error instanceof TypeError || code === 'unexpected_failure') return 'No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.';
  return 'No pudimos iniciar sesión. Revisa tu correo y contraseña.';
}
