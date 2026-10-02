'use client';

/**
 * fetch for sensitive admin actions. When the server answers REAUTH_REQUIRED (no 2FA confirmation in the
 * last 10 minutes), the panel's ReauthDialog asks for a code; after it succeeds the request is sent again
 * once. If the admin cancels, the original 401 response is returned to the caller.
 */
const OPEN = 'adm:reauth-open';
const DONE = 'adm:reauth-done';

export function requestReauth(): Promise<boolean> {
  return new Promise((resolve) => {
    const onDone = (event: Event) => {
      window.removeEventListener(DONE, onDone);
      resolve(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener(DONE, onDone);
    window.dispatchEvent(new Event(OPEN));
  });
}

export function finishReauth(ok: boolean) {
  window.dispatchEvent(new CustomEvent(DONE, { detail: ok }));
}

export const REAUTH_OPEN_EVENT = OPEN;

export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 401) return response;
  const data = await response.clone().json().catch(() => null);
  if (data?.code !== 'REAUTH_REQUIRED') return response;
  return (await requestReauth()) ? fetch(input, init) : response;
}
