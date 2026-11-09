import { supabase } from '../../shared/lib/supabase';
export function authClient() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}
export async function signIn(username: string, password: string) {
  const client = authClient();
  const { data, error } = await client.functions.invoke('staff-login', {
    body: { username, password },
  });
  if (error) {
    const response = (error as { context?: Response }).context;
    const detail =
      response && typeof response.json === 'function'
        ? await response.json().catch(() => null)
        : null;
    let code = 'backend_unavailable';
    if (!response) code = 'network_or_origin';
    else if (response.status === 404) code = 'login_function_missing';
    else if (response.status === 429) code = 'rate_limited';
    else if (response.status === 401)
      code = detail?.code === 'invalid_credentials' ? 'invalid_credentials' : 'gateway_auth_error';
    else if (response.status === 403) code = 'origin_not_allowed';
    else if (detail?.code === 'configuration_missing') code = 'backend_configuration_error';
    throw { code };
  }
  if (
    typeof data?.access_token !== 'string' ||
    !data.access_token ||
    typeof data?.refresh_token !== 'string' ||
    !data.refresh_token
  )
    throw { code: 'login_function_response_invalid' };
  const { error: sessionError } = await client.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessionError) throw sessionError;
}
export async function updatePassword(password: string) {
  const { error } = await authClient().auth.updateUser({ password });
  if (error) throw error;
}
