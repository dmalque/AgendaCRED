// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLoginHandler } from '../../../supabase/functions/staff-login/handler';
const origin = 'http://127.0.0.1:5173';
const services = { takeAttempt: vi.fn(), authenticate: vi.fn() };
const request = (username = ' Ana.Perez ', password = 'A password 123', requestOrigin = origin) =>
  new Request(origin, {
    method: 'POST',
    headers: { Origin: requestOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  services.takeAttempt.mockResolvedValue(true);
  services.authenticate.mockResolvedValue({ access_token: 'access', refresh_token: 'refresh' });
});
describe('username login endpoint', () => {
  it('normalizes usernames and returns only session tokens without caching', async () => {
    const response = await createLoginHandler(origin, services)(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ access_token: 'access', refresh_token: 'refresh' });
    expect(services.authenticate).toHaveBeenCalledWith('ana.perez', 'A password 123');
  });
  it('uses the same failure for nonexistent, inactive and incorrect credentials', async () => {
    services.authenticate.mockResolvedValue(null);
    const response = await createLoginHandler(origin, services)(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: 'invalid_credentials',
      error: 'Revisa tu usuario y contraseña.',
    });
  });
  it('rejects email syntax instead of accepting email logins', async () => {
    expect((await createLoginHandler(origin, services)(request('ana@example.org'))).status).toBe(
      401,
    );
    expect(services.authenticate).not.toHaveBeenCalled();
  });
  it('enforces the durable rate limit before contacting Auth', async () => {
    services.takeAttempt.mockResolvedValue(false);
    expect((await createLoginHandler(origin, services)(request())).status).toBe(429);
    expect(services.authenticate).not.toHaveBeenCalled();
  });
  it('fails closed on database configuration errors', async () => {
    services.takeAttempt.mockRejectedValue(new Error('private detail'));
    const response = await createLoginHandler(origin, services)(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: 'configuration_missing' });
    expect(services.authenticate).not.toHaveBeenCalled();
  });
  it('rejects foreign origins', async () => {
    expect(
      (
        await createLoginHandler(
          origin,
          services,
        )(request('ana.perez', 'password', 'https://foreign.example'))
      ).status,
    ).toBe(403);
    expect(services.takeAttempt).not.toHaveBeenCalled();
  });
});
