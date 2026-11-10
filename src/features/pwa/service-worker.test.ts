// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { it, expect, vi } from 'vitest';
const source = await readFile(new URL('../../../public/sw.js', import.meta.url), 'utf8');
function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const offline = new Response('offline notice', { headers: { 'Content-Type': 'text/html' } });
  const cache = {
    add: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(offline),
  };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi
      .fn()
      .mockResolvedValue(['agendacred-offline-v0', 'another-app', 'agendacred-offline-v1']),
    delete: vi.fn().mockResolvedValue(true),
  };
  const claim = vi.fn().mockResolvedValue(undefined);
  const fetch = vi.fn().mockResolvedValue(new Response('online'));
  runInNewContext(source, {
    URL,
    Request,
    Response,
    caches,
    fetch,
    self: {
      location: { origin: 'https://agenda.test' },
      clients: { claim },
      addEventListener: (name: string, handler: any) => (handlers[name] = handler),
    },
  });
  return { handlers, cache, caches, fetch, claim, offline };
}
it('caches only the public offline notice on installation', async () => {
  const w = worker();
  let promise: Promise<unknown> = Promise.resolve();
  w.handlers.install({ waitUntil: (p: Promise<unknown>) => (promise = p) });
  await promise;
  expect(w.cache.add).toHaveBeenCalledOnce();
  expect(w.cache.add.mock.calls[0][0].url).toBe('https://agenda.test/offline.html');
});
it.each([
  { method: 'POST', mode: 'cors', url: 'https://agenda.test/api' },
  { method: 'GET', mode: 'cors', url: 'https://project.supabase.co/rest/v1/children' },
  { method: 'GET', mode: 'cors', url: 'https://agenda.test/assets/app.js' },
  { method: 'GET', mode: 'navigate', url: 'https://other.test/' },
])('leaves API calls and non-navigation resources on the network %j', (request) => {
  const w = worker();
  const respondWith = vi.fn();
  w.handlers.fetch({ request, respondWith });
  expect(respondWith).not.toHaveBeenCalled();
  expect(w.caches.open).not.toHaveBeenCalled();
});
it('returns the offline notice when a navigation fails', async () => {
  const w = worker();
  w.fetch.mockRejectedValue(new TypeError('offline'));
  let response: Promise<Response> = Promise.resolve(new Response());
  w.handlers.fetch({
    request: { method: 'GET', mode: 'navigate', url: 'https://agenda.test/agenda' },
    respondWith: (p: Promise<Response>) => (response = p),
  });
  expect(await response).toBe(w.offline);
  expect(w.cache.match).toHaveBeenCalledWith('/offline.html');
});
it('returns online navigation without storing its response', async () => {
  const w = worker();
  let response: Promise<Response> = Promise.resolve(new Response());
  w.handlers.fetch({
    request: { method: 'GET', mode: 'navigate', url: 'https://agenda.test/ninos/one' },
    respondWith: (p: Promise<Response>) => (response = p),
  });
  expect(await (await response).text()).toBe('online');
  expect(w.caches.open).not.toHaveBeenCalled();
});
it('cleans only obsolete caches owned by this app', async () => {
  const w = worker();
  let promise: Promise<unknown> = Promise.resolve();
  w.handlers.activate({ waitUntil: (p: Promise<unknown>) => (promise = p) });
  await promise;
  expect(w.caches.delete.mock.calls).toEqual([['agendacred-offline-v0']]);
  expect(w.claim).toHaveBeenCalledOnce();
});
it('provides installable manifest icon dimensions and scope', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../../../public/manifest.webmanifest', import.meta.url), 'utf8'),
  );
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/ingresar');
  expect(manifest.scope).toBe('/');
  for (const icon of manifest.icons) {
    const data = await readFile(new URL('../../../public' + icon.src, import.meta.url));
    const size = Number(icon.sizes.split('x')[0]);
    expect(data.readUInt32BE(16)).toBe(size);
    expect(data.readUInt32BE(20)).toBe(size);
  }
});
