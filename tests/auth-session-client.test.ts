import assert from 'node:assert/strict';
import test from 'node:test';
import { submitCredentials } from '../src/lib/auth/session-client';

type Reply = { ok: boolean; body: unknown } | Error;

function fakeFetch(replies: Record<string, Reply>) {
  const calls: string[] = [];
  const impl = async (url: string) => {
    calls.push(url);
    const reply = replies[url];
    if (reply instanceof Error) throw reply;
    return { ok: reply.ok, json: async () => reply.body } as Response;
  };
  return { impl: impl as unknown as typeof fetch, calls };
}

test('a login that sets a session returns the user', async () => {
  const { impl } = fakeFetch({
    '/api/auth/login': { ok: true, body: { success: true } },
    '/api/auth/me': { ok: true, body: { user: { id: 'u1', role: 'CUSTOMER' } } },
  });
  const result = await submitCredentials(impl, '/api/auth/login', { email: 'a@b.co', password: 'x' }, 'Giriş başarısız.');
  assert.deepEqual(result, { success: true, user: { id: 'u1', role: 'CUSTOMER' } });
});

test('a rejected login returns the server message', async () => {
  const { impl, calls } = fakeFetch({ '/api/auth/login': { ok: false, body: { error: 'E-posta veya şifre hatalı.' } } });
  const result = await submitCredentials(impl, '/api/auth/login', {}, 'Giriş başarısız.');
  assert.deepEqual(result, { success: false, error: 'E-posta veya şifre hatalı.' });
  assert.deepEqual(calls, ['/api/auth/login']);
});

test('an accepted login without a readable session is reported, not silently successful', async () => {
  const { impl } = fakeFetch({
    '/api/auth/login': { ok: true, body: { success: true } },
    '/api/auth/me': { ok: true, body: { user: null } },
  });
  const result = await submitCredentials(impl, '/api/auth/login', {}, 'Giriş başarısız.');
  assert.equal(result.success, false);
  assert.match(!result.success ? result.error : '', /Oturum başlatılamadı/);
});

test('network failures return a connection error', async () => {
  const { impl } = fakeFetch({ '/api/auth/register': new Error('offline') });
  const result = await submitCredentials(impl, '/api/auth/register', {}, 'Kayıt başarısız.');
  assert.deepEqual(result, { success: false, error: 'Bağlantı hatası oluştu.' });
});
