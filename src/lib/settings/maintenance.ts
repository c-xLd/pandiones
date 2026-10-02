/** Paths that stay open in maintenance mode: the admin panel and its APIs, sign-in, the maintenance page
 *  itself, and the payment callback (a payment started before the switch must still complete). */
const EXEMPT_SECTIONS = ['/yonetim', '/giris-yap', '/sifremi-unuttum', '/sifre-sifirla', '/e-posta-dogrula', '/bakim', '/api/admin', '/api/auth', '/api/payment', '/api/cron'];

export function isMaintenanceExempt(pathname: string): boolean {
  // Real static files only (a page path with a dot must not slip past maintenance).
  if (/\.(png|jpe?g|webp|avif|gif|svg|ico|txt|xml|webmanifest|woff2?|mp4|webm)$/i.test(pathname)) return true;
  return EXEMPT_SECTIONS.some((section) => pathname === section || pathname.startsWith(`${section}/`));
}
