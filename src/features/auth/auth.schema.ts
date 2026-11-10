import { z } from 'zod';
import { usernamePattern, usernameHint } from '../../../supabase/functions/_shared/credentials';
export const usernameSchema = z.string().trim().toLowerCase().regex(usernamePattern, usernameHint);
export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Ingresa tu contraseña.').max(128, 'Usa como máximo 128 caracteres.'),
});
export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(6, 'Usa al menos 6 caracteres.')
      .max(128, 'Usa como máximo 128 caracteres.'),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: 'Las contraseñas no coinciden.',
  });

export function authMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (['over_request_rate_limit', 'rate_limited'].includes(code))
    return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  const configurationMessages: Record<string, string> = {
    login_function_missing:
      'No se encontró la función staff-login en Supabase (404). Debe publicarse con ese nombre exacto en Edge Functions.',
    gateway_auth_error:
      'Supabase está bloqueando el ingreso antes de comprobar tus datos. Revisa que Verify JWT esté desactivado en la función staff-login.',
    origin_not_allowed:
      'La función rechazó la dirección de esta aplicación. Revisa que APP_ORIGIN coincida con la dirección del navegador.',
    network_or_origin:
      'No se pudo contactar con la función de ingreso. Revisa la conexión y que APP_ORIGIN coincida con la dirección del navegador.',
    backend_configuration_error:
      'La función de ingreso respondió, pero falló su configuración o consulta a la base de datos. Revisa sus registros en Supabase → Edge Functions → staff-login → Logs.',
    login_function_response_invalid:
      'La función staff-login devolvió una respuesta inesperada. Comprueba que contiene el código de AgendaCRED y no el ejemplo de Supabase.',
    backend_unavailable:
      'La función de ingreso no pudo completar la solicitud. Revisa sus registros en Supabase → Edge Functions → staff-login → Logs.',
  };
  if (configurationMessages[code]) return configurationMessages[code];
  if (error instanceof TypeError || code === 'unexpected_failure')
    return 'No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.';
  return 'No pudimos iniciar sesión. Revisa tu usuario y contraseña.';
}
