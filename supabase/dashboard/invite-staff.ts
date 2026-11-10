// GENERATED from supabase/functions. Regenerate instead of editing this copy.
// Paste this ENTIRE file into index.ts in the Supabase web editor.
export const usernamePattern = /^[a-z][a-z0-9._-]{2,23}$/;
export const normalizeUsername = (value: string) => value.trim().toLowerCase();
export const usernameHint =
  'Usa 3 a 24 caracteres: letras, números, punto, guion o guion bajo; empieza con una letra.';

// Dependency injection lets local tests cover the real HTTP/security workflow.
type Caller = { id: string; role: string; active: boolean };
type Profile = { id: string; full_name: string; username: string; role: string; active: boolean };
export type StaffServices = {
  getCaller: (token: string) => Promise<Caller | null>;
  createIdentity: (username: string, password: string) => Promise<{ id: string } | null>;
  saveProfile: (token: string, profile: Profile) => Promise<boolean>;
  deleteIdentity: (id: string) => Promise<boolean>;
  resetPassword: (
    token: string,
    id: string,
    password: string,
  ) => Promise<'ok' | 'denied' | 'failed'>;
};

export function createStaffHandler(appOrigin: string | undefined, services: StaffServices) {
  return async (request: Request): Promise<Response> => {
    const cors = {
      'Access-Control-Allow-Origin': appOrigin || '',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    };
    const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
    if (!appOrigin || request.headers.get('Origin') !== appOrigin)
      return respond({ error: 'Origen no permitido. Revisa APP_ORIGIN en Supabase.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return respond({ error: 'Método no permitido.' }, 405);
    const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return respond({ error: 'Inicia sesión para crear cuentas.' }, 401);

    try {
      const caller = await services.getCaller(token);
      if (!caller) return respond({ error: 'La sesión no es válida. Vuelve a ingresar.' }, 401);
      if (!caller.active || !['admin', 'manager'].includes(caller.role))
        return respond({ error: 'Tu perfil no tiene permiso para crear cuentas.' }, 403);
      let body: Record<string, unknown>;
      try {
        const parsed = await request.json();
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
        body = parsed;
      } catch {
        return respond({ error: 'Datos no válidos.' }, 400);
      }
      if (body.action === 'reset_password') {
        if (
          typeof body.id !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id) ||
          typeof body.password !== 'string' ||
          body.password.length < 6 ||
          body.password.length > 128
        )
          return respond({ error: 'Revisa la cuenta y la contraseña (6 a 128 caracteres).' }, 400);
        const outcome = await services.resetPassword(token, body.id, body.password);
        if (outcome !== 'ok')
          return respond(
            {
              error:
                outcome === 'denied'
                  ? 'No tienes permiso para restablecer esta cuenta. Para tu propia clave usa Cambiar mi contraseña.'
                  : 'No se pudo actualizar la contraseña. Revisa la política de contraseñas de Supabase.',
            },
            outcome === 'denied' ? 403 : 400,
          );
        return respond({ id: body.id });
      }
      if (body.action && body.action !== 'create')
        return respond({ error: 'Operación no válida.' }, 400);
      if (typeof body.role !== 'string' || !['admin', 'manager', 'nurse'].includes(body.role))
        return respond({ error: 'Selecciona un rol válido.' }, 400);
      if (caller.role === 'manager' && body.role !== 'nurse')
        return respond({ error: 'El responsable solo puede crear cuentas de enfermería.' }, 403);
      if (
        typeof body.username !== 'string' ||
        !usernamePattern.test(normalizeUsername(body.username)) ||
        typeof body.full_name !== 'string' ||
        body.full_name.trim().length < 3 ||
        body.full_name.length > 120 ||
        typeof body.password !== 'string' ||
        body.password.length < 6 ||
        body.password.length > 128
      )
        return respond({ error: 'Revisa nombre, usuario y contraseña (6 a 128 caracteres).' }, 400);

      const identity = await services.createIdentity(
        normalizeUsername(body.username),
        body.password,
      );
      if (!identity)
        return respond(
          {
            error:
              'No se pudo crear la cuenta. Revisa la configuración y la política de contraseñas de Supabase.',
          },
          400,
        );
      let saved = false;
      try {
        saved = await services.saveProfile(token, {
          id: identity.id,
          full_name: body.full_name.trim(),
          username: normalizeUsername(body.username),
          role: body.role,
          active: true,
        });
      } catch {
        /* A failed profile always triggers compensation. */
      }
      if (!saved) {
        let removed = false;
        try {
          removed = await services.deleteIdentity(identity.id);
        } catch {
          /* Report cleanup failure. */
        }
        return respond(
          {
            error: removed
              ? 'No se pudo habilitar el perfil. El usuario puede estar ocupado; revisa la migración 004 y tus permisos. La nueva cuenta se revirtió.'
              : 'No se pudo habilitar el perfil ni revertir la nueva cuenta. El administrador debe revisarla en Authentication antes de reintentar.',
          },
          500,
        );
      }
      return respond({ id: identity.id }, 201);
    } catch {
      return respond(
        { error: 'No se pudo completar la operación. Revisa la conexión con Supabase.' },
        500,
      );
    }
  };
}

// Legacy endpoint name retained. Privileged keys never leave this server.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(
  createStaffHandler(Deno.env.get('APP_ORIGIN'), {
    async getCaller(token) {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return null;
      const { data: profile, error: profileError } = await admin
        .from('staff_profiles')
        .select('role,active')
        .eq('id', data.user.id)
        .single();
      return profileError || !profile ? null : { id: data.user.id, ...profile };
    },
    async createIdentity(_username, password) {
      const { data, error } = await admin.auth.admin.createUser({
        // Opaque internal Auth identifier; no mailbox or outgoing mail is used.
        email: `staff.${crypto.randomUUID()}@accounts.agendacred.invalid`,
        password,
        email_confirm: true,
      });
      return error || !data.user ? null : { id: data.user.id };
    },
    async saveProfile(token, profile) {
      // Recheck current authorization in PostgreSQL using the caller's session.
      const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { error } = await client.rpc('mutate_cred', { action: 'save_staff', p: profile });
      return !error;
    },
    async deleteIdentity(id) {
      const { error } = await admin.auth.admin.deleteUser(id);
      return !error;
    },
    async resetPassword(token, id, password) {
      const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { error: denied } = await client.rpc('mutate_cred', {
        action: 'authorize_password_reset',
        p: { id },
      });
      if (denied) return 'denied';
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      return error ? 'failed' : 'ok';
    },
  }),
);
