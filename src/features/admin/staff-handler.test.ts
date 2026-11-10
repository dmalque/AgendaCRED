// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStaffHandler } from '../../../supabase/functions/invite-staff/handler';

const origin = 'http://127.0.0.1:5173';
const services = {
  getCaller: vi.fn(),
  createIdentity: vi.fn(),
  saveProfile: vi.fn(),
  deleteIdentity: vi.fn(),
  resetPassword: vi.fn(),
};
const payload = {
  username: ' ANA.PEREZ ',
  full_name: 'Enfermera de prueba',
  role: 'nurse',
  password: 'Clave-inicial-1234',
};
const request = (body: unknown = payload, headers: Record<string, string> = {}) =>
  new Request(origin, {
    method: 'POST',
    headers: {
      Origin: origin,
      Authorization: 'Bearer session-token',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  services.getCaller.mockResolvedValue({ id: 'manager', role: 'manager', active: true });
  services.createIdentity.mockResolvedValue({ id: 'new-auth-id' });
  services.saveProfile.mockResolvedValue(true);
  services.deleteIdentity.mockResolvedValue(true);
});
describe('staff account endpoint', () => {
  it('restores a password through the authorized server service', async () => {
    services.resetPassword.mockResolvedValue('ok');
    const id = '10000000-0000-0000-0000-000000000002';
    const response = await createStaffHandler(
      origin,
      services,
    )(request({ action: 'reset_password', id, password: payload.password }));
    expect(response.status).toBe(200);
    expect(services.resetPassword).toHaveBeenCalledWith('session-token', id, payload.password);
    expect(services.createIdentity).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ id });
  });
  it('propagates database denial before a privileged password update', async () => {
    services.resetPassword.mockResolvedValue('denied');
    const response = await createStaffHandler(
      origin,
      services,
    )(
      request({
        action: 'reset_password',
        id: '10000000-0000-0000-0000-000000000001',
        password: payload.password,
      }),
    );
    expect(response.status).toBe(403);
    expect(services.createIdentity).not.toHaveBeenCalled();
  });
  it('creates a nurse with the caller RPC and never returns the password', async () => {
    const response = await createStaffHandler(origin, services)(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'new-auth-id' });
    expect(services.createIdentity).toHaveBeenCalledWith('ana.perez', payload.password);
    expect(services.saveProfile).toHaveBeenCalledWith('session-token', {
      id: 'new-auth-id',
      full_name: payload.full_name,
      username: 'ana.perez',
      role: 'nurse',
      active: true,
    });
  });
  it.each(['admin', 'manager'])('blocks a manager creating %s', async (role) => {
    expect((await createStaffHandler(origin, services)(request({ ...payload, role }))).status).toBe(
      403,
    );
    expect(services.createIdentity).not.toHaveBeenCalled();
  });
  it('allows administrator creation of a manager', async () => {
    services.getCaller.mockResolvedValue({ id: 'admin', role: 'admin', active: true });
    expect(
      (await createStaffHandler(origin, services)(request({ ...payload, role: 'manager' }))).status,
    ).toBe(201);
  });
  it.each([
    { role: 'nurse', active: true },
    { role: 'manager', active: false },
  ])('blocks an unauthorized or disabled caller', async (caller) => {
    services.getCaller.mockResolvedValue({ id: 'caller', ...caller });
    expect((await createStaffHandler(origin, services)(request())).status).toBe(403);
    expect(services.createIdentity).not.toHaveBeenCalled();
  });
  it('refuses a missing or invalid session before creating identities', async () => {
    const handler = createStaffHandler(origin, services);
    expect((await handler(request(payload, { Authorization: '' }))).status).toBe(401);
    services.getCaller.mockResolvedValue(null);
    expect((await handler(request())).status).toBe(401);
    expect(services.createIdentity).not.toHaveBeenCalled();
  });
  it('rejects a foreign origin', async () => {
    expect(
      (
        await createStaffHandler(
          origin,
          services,
        )(request(payload, { Origin: 'https://untrusted.example' }))
      ).status,
    ).toBe(403);
    expect(services.getCaller).not.toHaveBeenCalled();
  });
  it('rejects weak credentials before calling Auth', async () => {
    expect(
      (await createStaffHandler(origin, services)(request({ ...payload, password: 'short' })))
        .status,
    ).toBe(400);
    expect(services.createIdentity).not.toHaveBeenCalled();
  });
  it('never changes an existing account when Auth creation fails', async () => {
    services.createIdentity.mockResolvedValue(null);
    expect((await createStaffHandler(origin, services)(request())).status).toBe(400);
    expect(services.saveProfile).not.toHaveBeenCalled();
    expect(services.deleteIdentity).not.toHaveBeenCalled();
  });
  it.each(['denied', 'network'])(
    'compensates only the new identity after profile failure: %s',
    async (mode) => {
      if (mode === 'network') services.saveProfile.mockRejectedValue(new Error('network'));
      else services.saveProfile.mockResolvedValue(false);
      const response = await createStaffHandler(origin, services)(request());
      expect(response.status).toBe(500);
      expect(services.deleteIdentity).toHaveBeenCalledWith('new-auth-id');
      expect((await response.json()).error).toMatch(/se revirtió/);
    },
  );
  it('reports incomplete cleanup explicitly', async () => {
    services.saveProfile.mockResolvedValue(false);
    services.deleteIdentity.mockResolvedValue(false);
    const response = await createStaffHandler(origin, services)(request());
    expect((await response.json()).error).toMatch(/Authentication antes de reintentar/);
  });
});
