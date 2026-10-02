'use client';

import { adminFetch } from './admin-fetch';

/** GET for a tab's data: throws the server's message (or the fallback) when the answer is not usable. */
export async function loadJson<T>(url: string, fallback: string, isValid: (data: unknown) => boolean = () => true): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new Error('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !isValid(data)) throw new Error((data as { error?: string } | null)?.error || fallback);
  return data as T;
}

/** A mutation through adminFetch (2FA re-check included). Resolves with the body, throws with a readable message. */
export async function sendJson<T = unknown>(url: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body: unknown, fallback: string): Promise<T> {
  let response: Response;
  try {
    response = await adminFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new Error('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || (data && typeof data === 'object' && 'success' in data && data.success === false)) {
    throw new Error((data as { error?: string } | null)?.error || fallback);
  }
  return data as T;
}

export const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);
