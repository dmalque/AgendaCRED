import { normalizeUsername, usernamePattern } from '../_shared/credentials.ts';
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
