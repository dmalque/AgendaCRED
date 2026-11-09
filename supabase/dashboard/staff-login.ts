// GENERATED from supabase/functions. Regenerate instead of editing this copy.
// Paste this ENTIRE file into index.ts in the Supabase web editor.
export const usernamePattern = /^[a-z][a-z0-9._-]{2,23}$/;
export const normalizeUsername = (value: string) => value.trim().toLowerCase();
export const usernameHint =
  'Usa 3 a 24 caracteres: letras, números, punto, guion o guion bajo; empieza con una letra.';

export type LoginServices = {
  takeAttempt: (username: string) => Promise<boolean>;
  authenticate: (
    username: string,
    password: string,
  ) => Promise<{ access_token: string; refresh_token: string } | null>;
};
export function createLoginHandler(appOrigin: string | undefined, services: LoginServices) {
  return async (request: Request): Promise<Response> => {
    const headers = {
      'Access-Control-Allow-Origin': appOrigin || '',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    };
    const respond = (body: unknown, status = 200) => Response.json(body, { status, headers });
    if (!appOrigin || request.headers.get('Origin') !== appOrigin)
      return respond({ code: 'configuration_missing' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return respond({ code: 'method_not_allowed' }, 405);
    const invalid = () =>
      respond({ code: 'invalid_credentials', error: 'Revisa tu usuario y contraseña.' }, 401);
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return invalid();
    }
    if (
      !body ||
      typeof body.username !== 'string' ||
      !usernamePattern.test(normalizeUsername(body.username)) ||
      typeof body.password !== 'string' ||
      !body.password.length ||
      body.password.length > 128
    )
      return invalid();
    try {
      const username = normalizeUsername(body.username);
      if (!(await services.takeAttempt(username))) return respond({ code: 'rate_limited' }, 429);
      const session = await services.authenticate(username, body.password);
      return session ? respond(session) : invalid();
    } catch {
      return respond({ code: 'configuration_missing' }, 503);
    }
  };
}

import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
const url = Deno.env.get('SUPABASE_URL')!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, options);
Deno.serve(
  createLoginHandler(Deno.env.get('APP_ORIGIN'), {
    async takeAttempt(username) {
      const { data, error } = await admin.rpc('take_staff_login_attempt', {
        login_username: username,
      });
      if (error) throw error;
      return data === true;
    },
    async authenticate(username, password) {
      const { data: profile, error } = await admin
        .from('staff_profiles')
        .select('id,active')
        .eq('username', username)
        .maybeSingle();
      if (error) throw error;
      if (!profile?.active) return null;
      const { data: identity, error: identityError } = await admin.auth.admin.getUserById(
        profile.id,
      );
      if (identityError || !identity.user?.email) return null;
      // A fresh, nonprivileged Auth client per attempt prevents sharing sessions.
      const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, options);
      const { data, error: authError } = await client.auth.signInWithPassword({
        email: identity.user.email,
        password,
      });
      if (authError || !data.session) return null;
      return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
    },
  }),
);
