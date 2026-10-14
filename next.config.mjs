import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';
import { securityHeaders } from './src/lib/security/headers.mjs';

/** Uploaded product media may live on the S3 public host; allow exactly that host for next/image. */
function mediaRemotePatterns() {
  const base = process.env.MEDIA_PUBLIC_BASE_URL;
  if (!base) return [];
  try {
    const url = new URL(base);
    return [{ protocol: url.protocol.replace(':', ''), hostname: url.hostname, pathname: `${url.pathname.replace(/\/$/, '')}/**` }];
  } catch {
    return [];
  }
}

/** @type {(phase: string) => import('next').NextConfig} */
const nextConfig = (phase) => ({
  reactStrictMode: true,
  // No "X-Powered-By: Next.js" banner.
  poweredByHeader: false,
  // iyzipay loads its resources with dynamic require(); run it as a plain Node module.
  serverExternalPackages: ['iyzipay'],
  // `next dev` and `next build` must not share one build directory: a build while the dev server runs
  // rewrites .next and the dev server then fails with "Cannot find module './NNNN.js'". Build/start keep .next.
  ...(phase === PHASE_DEVELOPMENT_SERVER ? { distDir: '.next-dev' } : {}),
  // Parallel local dev servers must not share one build directory.
  ...(process.env.PANDIONES_LAN_PREVIEW === '1' ? { distDir: '.next-lan-preview' } : {}),
  ...(process.env.PANDIONES_DIST_DIR ? { distDir: process.env.PANDIONES_DIST_DIR } : {}),
  // next/image resizes and converts to AVIF/WebP (sharp). Plain <img> tags elsewhere are unaffected.
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [96, 128, 192, 256, 320],
    // Allowed encoding qualities (src/lib/images.ts). An <Image> without `quality` defaults to 75,
    // which Next snaps to the nearest entry here (85).
    qualities: [60, 85],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: mediaRemotePatterns(),
  },
  // Security headers on every response (src/lib/security/headers.mjs).
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders() }];
  },
  async redirects() {
    // Catalogue addresses are /kategori, /kategori/alt-kategori and /urun/slug; the old
    // /koleksiyon, /collection(s), /urunler and /products paths are intentionally 404.
    return [
      {
        source: '/checkout',
        destination: '/odeme',
        permanent: true,
      },
      {
        source: '/order-success/:id',
        destination: '/siparis-onay/:id',
        permanent: true,
      },
      {
        source: '/product-guide-size.html',
        destination: '/beden-rehberi',
        permanent: true,
      },
      {
        source: '/product-guide-style.html',
        destination: '/stil-rehberi',
        permanent: true,
      },
      {
        source: '/product-guide-care.html',
        destination: '/bakim-rehberi',
        permanent: true,
      },
      {
        source: '/orderstatus',
        destination: '/siparis-takip',
        permanent: true,
      },
      {
        source: '/contactform',
        destination: '/iletisim',
        permanent: true,
      },
      {
        source: '/giftcard',
        destination: '/hediye-karti',
        permanent: true,
      },
      {
        source: '/customer-service-general-info.html',
        destination: '/yardim',
        permanent: true,
      },
    ];
  },
});

export default nextConfig;
