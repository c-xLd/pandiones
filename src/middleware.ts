import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_DEVICE_COOKIE, SESSION_COOKIE, getCurrentUser, hadAdminSession, isAdminDevice, readSessionClaims } from '@/lib/auth';
import { isMaintenanceExempt } from '@/lib/settings/maintenance';
import { isAdminIpAllowed, isCrossSiteMutation, isOversizedBody } from '@/lib/security/edge-rules';
import { isPanelRole } from '@/lib/security/roles';

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

let refreshing: Promise<void> | null = null;

function refreshMaintenance(): Promise<void> {
  refreshing ??= prisma.storeSettings
    .findUnique({ where: { id: 'store' }, select: { maintenanceEnabled: true } })
    .then((row) => {
      cached = { enabled: Boolean(row?.maintenanceEnabled), at: Date.now() };
    })
    .catch((error) => {
      // A database outage must not lock everyone out; keep the last known value, else assume open.
      console.error('Maintenance check failed:', error);
      cached = { enabled: cached?.enabled ?? false, at: Date.now() };
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Only a fresh instance waits for the database. After that the last value answers at once and a stale one
 * (older than 5 s) is refreshed in the background, so no visitor's page waits on this round trip.
 */
async function maintenanceEnabled(event?: NextFetchEvent): Promise<boolean> {
  if (!cached) await refreshMaintenance();
  else if (Date.now() - cached.at >= TTL_MS) {
    const refresh = refreshMaintenance();
    if (event) event.waitUntil(refresh);
  }
  return cached?.enabled ?? false;
}

const ADMIN_LOGIN = '/yonetim/giris';
const isAdminPage = (p: string) => (p === '/yonetim' || p.startsWith('/yonetim/')) && p !== ADMIN_LOGIN;
const isAdminApi = (p: string) => p === '/api/admin' || p.startsWith('/api/admin/');
const isPrivateCustomerPath = (p: string) =>
  p === '/hesabim' || p.startsWith('/hesabim/') ||
  p === '/siparislerim' || p.startsWith('/siparislerim/') ||
  p === '/canta' || p.startsWith('/canta/') ||
  p === '/odeme' || p.startsWith('/odeme/') ||
  p === '/sepet' || p.startsWith('/sepet/') ||
  p === '/api/auth' || p.startsWith('/api/auth/');

function notFound(request: NextRequest) {
  // The normal 404 page, nothing that hints at a panel. /bulunamadi renders it at once; an unknown path
  // would fall into [kategori] and flash the catalogue skeleton before the 404.
  return NextResponse.rewrite(new URL('/bulunamadi', request.url), { status: 404 });
}

function privateHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

function privateCustomerHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export async function middleware(request: NextRequest, event?: NextFetchEvent) {
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
    if (!session || !isPanelRole(session.role)) {
      if (isAdminApi(pathname)) return privateHeaders(NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 }));
      // A browser that signed in to the panel before (signed device marker, or an ended admin session cookie)
      // is sent to sign in again rather than a bare 404. Everyone else gets the 404.
      if (isAdminDevice(request.cookies.get(ADMIN_DEVICE_COOKIE)?.value) || hadAdminSession(request.cookies.get(SESSION_COOKIE)?.value || request.cookies.get('pandiones_auth')?.value)) {
        return privateHeaders(NextResponse.redirect(new URL(`${ADMIN_LOGIN}?neden=oturum`, request.url)));
      }
      return privateHeaders(notFound(request));
    }
    return privateHeaders(NextResponse.next());
  }

  if (!(await maintenanceEnabled(event))) {
    // /bakim only exists while maintenance is on.
    if (pathname === '/bakim') return NextResponse.redirect(new URL('/', request.url));
    if (isPrivateCustomerPath(pathname)) return privateCustomerHeaders(NextResponse.next());
    return NextResponse.next();
  }

  if (isMaintenanceExempt(pathname)) {
    if (isPrivateCustomerPath(pathname)) return privateCustomerHeaders(NextResponse.next());
    return NextResponse.next();
  }

  // Signed claim only (cheap); admin data itself is still checked against the session row by every API.
  const claims = readSessionClaims(request.cookies.get(SESSION_COOKIE)?.value);
  if (claims && isPanelRole(claims.role) && claims.mfa) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Mağaza şu an bakımda. Lütfen biraz sonra tekrar deneyin.' }, { status: 503 });
  }
  return NextResponse.rewrite(new URL('/bakim', request.url), { status: 503, headers: { 'Retry-After': '1800' } });
}
