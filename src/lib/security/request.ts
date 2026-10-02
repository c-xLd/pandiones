/**
 * Who is calling. Only a header written by the proxy in front of the app can be trusted; anything else
 * the client can type. `TRUSTED_PROXY` says which proxy that is:
 *  - unset / "vercel": Vercel overwrites `x-real-ip` (and `x-vercel-forwarded-for`) with the address it
 *    saw, so a client-sent `cf-connecting-ip` or `x-forwarded-for` is ignored;
 *  - "cloudflare": Cloudflare in front of Vercel — the visitor is `cf-connecting-ip` (Vercel would only see
 *    Cloudflare). Set this only when the origin accepts traffic from Cloudflare alone (docs/OPERATIONS.md).
 * Outside production (local dev, tests) the left-most `x-forwarded-for` is used as well.
 */
export function clientIp(request: Request): string {
  const h = request.headers;
  const proxy = (process.env.TRUSTED_PROXY || 'vercel').toLowerCase();
  const fromProxy =
    proxy === 'cloudflare'
      ? h.get('cf-connecting-ip')
      : h.get('x-vercel-forwarded-for')?.split(',')[0] || h.get('x-real-ip');
  const candidate = fromProxy || (process.env.NODE_ENV !== 'production' ? h.get('x-forwarded-for')?.split(',')[0] : '') || '';
  const ip = candidate.trim();
  return /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : 'unknown';
}

export function userAgent(request: Request): string | null {
  const ua = request.headers.get('user-agent');
  return ua ? ua.slice(0, 200) : null;
}

/** Reads a JSON body with a size cap; returns null for an oversized, empty or non-JSON body. */
export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = 16 * 1024): Promise<{ ok: true; body: T } | { ok: false; status: 400 | 413 }> {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) return { ok: false, status: 413 };
  const text = await request.text();
  if (text.length > maxBytes) return { ok: false, status: 413 };
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, status: 400 };
    return { ok: true, body: body as T };
  } catch {
    return { ok: false, status: 400 };
  }
}
