import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, getCurrentUser, readSessionClaims } from '@/lib/auth';
import { isMaintenanceExempt } from '@/lib/settings/maintenance';
import { isAdminIpAllowed, isCrossSiteMutation, isOversizedBody } from '@/lib/security/edge-rules';

/**
 * Runs on Node (it reads the database). In order:
 *  0. Oversized API bodies (413).
 *  1. Cross-site writes: a state-changing API request from another site is refused (CSRF).
 *  2. Admin isolation: /yonetim and /api/admin answer only to a valid admin session that passed 2FA
 *     (checked against the session row); anyone else gets a plain 404 / 403 — the panel's code is not
 *     even served. Optional ADMIN_ALLOWED_IPS limits them to known addresses.
 *  3. Maintenance mode (Yönetim → Ayarlar): visitors get /bakim (503); admins see the site.
 */
export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_next/|assets/|fonts/|favicon).*)'],
};

const TTL_MS = 5_000;
let cached: { enabled: boolean; at: number } | null = null;

async function maintenanceEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.enabled;
  try {
    const row = await prisma.storeSettings.findUnique({ where: { id: 'store' }, select: { maintenanceEnabled: true } });
    cached = { enabled: Boolean(row?.maintenanceEnabled), at: now };
  } catch (error) {
    // A database outage must not lock everyone out; keep the last known value, else assume open.
    console.error('Maintenance check failed:', error);
    cached = { enabled: cached?.enabled ?? false, at: now };
  }
  return cached.enabled;
}

const ADMIN_LOGIN = '/yonetim/giris';
const isAdminPage = (p: string) => (p === '/yonetim' || p.startsWith('/yonetim/')) && p !== ADMIN_LOGIN;
const isAdminApi = (p: string) => p === '/api/admin' || p.startsWith('/api/admin/');

function notFound(request: NextRequest) {
  // Rewrite to a path that does not exist: the normal 404 page, nothing that hints at a panel.
  return NextResponse.rewrite(new URL('/__yok', request.url), { status: 404 });
}

function privateHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isOversizedBody(request)) {
    return NextResponse.json({ error: 'İstek çok büyük.' }, { status: 413 });
  }

  if (isCrossSiteMutation(request)) {
    return NextResponse.json({ error: 'Bu istek başka bir siteden geldiği için reddedildi.' }, { status: 403 });
  }

  if (isAdminPage(pathname) || isAdminApi(pathname) || pathname === ADMIN_LOGIN) {
    if (!isAdminIpAllowed(request)) return isAdminApi(pathname) ? NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 }) : notFound(request);
    if (pathname === ADMIN_LOGIN) return privateHeaders(NextResponse.next());
    const session = await getCurrentUser(request);
    if (!session || session.role !== 'ADMIN') {
      return isAdminApi(pathname) ? privateHeaders(NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 })) : privateHeaders(notFound(request));
    }
    return privateHeaders(NextResponse.next());
  }

  if (!(await maintenanceEnabled())) {
    // /bakim only exists while maintenance is on.
    if (pathname === '/bakim') return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  if (isMaintenanceExempt(pathname)) return NextResponse.next();

  // Signed claim only (cheap); admin data itself is still checked against the session row by every API.
  const claims = readSessionClaims(request.cookies.get(SESSION_COOKIE)?.value);
  if (claims?.role === 'ADMIN' && claims.mfa) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Mağaza şu an bakımda. Lütfen biraz sonra tekrar deneyin.' }, { status: 503 });
  }
  return NextResponse.rewrite(new URL('/bakim', request.url), { status: 503, headers: { 'Retry-After': '1800' } });
}
