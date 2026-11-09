import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signIn } from './auth.service';
const client = vi.hoisted(() => ({
  functions: { invoke: vi.fn() },
  auth: { setSession: vi.fn() },
}));
vi.mock('../../shared/lib/supabase', () => ({ supabase: client }));
beforeEach(() => {
  vi.resetAllMocks();
  client.functions.invoke.mockResolvedValue({
    data: { access_token: 'access', refresh_token: 'refresh' },
    error: null,
  });
  client.auth.setSession.mockResolvedValue({ error: null });
});
describe('username authentication service', () => {
  it.each([
    [404, { code: 'NOT_FOUND' }, 'login_function_missing'],
    [401, { message: 'Invalid JWT' }, 'gateway_auth_error'],
    [403, { code: 'configuration_missing' }, 'origin_not_allowed'],
    [503, { code: 'configuration_missing' }, 'backend_configuration_error'],
    [500, {}, 'backend_unavailable'],
  ])('distinguishes HTTP %s from incorrect credentials', async (status, body, code) => {
    client.functions.invoke.mockResolvedValue({
      data: null,
      error: { context: new Response(JSON.stringify(body), { status }) },
    });
    await expect(signIn('ana.perez', 'password')).rejects.toEqual({ code });
    expect(client.auth.setSession).not.toHaveBeenCalled();
  });
  it('reports a network or CORS failure without claiming a migration is missing', async () => {
    client.functions.invoke.mockResolvedValue({
      data: null,
      error: { name: 'FunctionsFetchError' },
    });
    await expect(signIn('ana.perez', 'password')).rejects.toEqual({ code: 'network_or_origin' });
  });
  it('detects the Hello World template instead of reporting a missing migration', async () => {
    client.functions.invoke.mockResolvedValue({ data: { message: 'Hello name!' }, error: null });
    await expect(signIn('ana.perez', 'password')).rejects.toEqual({
      code: 'login_function_response_invalid',
    });
    expect(client.auth.setSession).not.toHaveBeenCalled();
  });
  it('restores the SDK session through the login endpoint', async () => {
    await signIn('ana.perez', 'password');
    expect(client.functions.invoke).toHaveBeenCalledWith('staff-login', {
      body: { username: 'ana.perez', password: 'password' },
    });
    expect(client.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });
  it('never sets a session after failed credentials', async () => {
    client.functions.invoke.mockResolvedValue({
      data: null,
      error: { context: new Response('{"code":"invalid_credentials"}', { status: 401 }) },
    });
    await expect(signIn('ana.perez', 'wrong')).rejects.toEqual({ code: 'invalid_credentials' });
    expect(client.auth.setSession).not.toHaveBeenCalled();
  });
  it('reports throttling without exposing internal details', async () => {
    client.functions.invoke.mockResolvedValue({
      data: null,
      error: { context: new Response('{}', { status: 429 }) },
    });
    await expect(signIn('ana.perez', 'wrong')).rejects.toEqual({ code: 'rate_limited' });
  });
});
