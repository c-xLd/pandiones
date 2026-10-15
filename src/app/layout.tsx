import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { preload } from 'react-dom';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import DeferredOverlays from '@/components/layout/DeferredOverlays';
import ToastNotification from '@/components/layout/ToastNotification';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import SiteChrome from '@/components/layout/SiteChrome';
import ScrollToTopOnNavigate from '@/components/layout/ScrollToTopOnNavigate';
import { getStoreSettings } from '@/lib/settings/server';
import { getSiteUrl, safeJsonLd } from '@/lib/seo';

// Only the wordmark uses this face, always at 500. Subset of MontserratAlt1-Medium.otf
// (Latin letters, digits, Turkish capitals) as WOFF2: 7 KB instead of three 176 KB OTFs.
const logoFont = localFont({
  src: [
    {
      path: '../../public/fonts/MontserratAlt1-Medium-subset.woff2',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: '--font-logo',
  display: 'swap',
});

const FAVICON = {
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23f5f2ec'/%3E%3Ctext x='10' y='30' font-size='30' fill='%232d2924'%3EP%3C/text%3E%3C/svg%3E",
  },
} satisfies Metadata;

/** Default title and description come from Yönetim → Ayarlar → SEO; pages override them as before. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  const siteUrl = getSiteUrl();
  const defaultOg = settings.seoDefaultOgImage || `${siteUrl}/assets/home/hero.webp`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: settings.seoTitle,
      template: '%s | Pandiones',
    },
    description: settings.seoDescription,
    openGraph: {
      title: settings.seoTitle,
      description: settings.seoDescription,
      url: siteUrl,
      siteName: 'Pandiones',
      locale: 'tr_TR',
      type: 'website',
      images: [
        {
          url: defaultOg,
          width: 1200,
          height: 630,
          alt: 'Pandiones',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.seoTitle,
      description: settings.seoDescription,
      images: [defaultOg],
    },
    verification: {
      google: settings.gscVerificationTag || undefined,
      other: {
        ...(settings.merchantVerificationTag ? { 'google-site-verification': settings.merchantVerificationTag } : {}),
      },
    },
    ...FAVICON,
  };
}

// Text faces used above the fold on every page; fetched with the HTML instead of after the CSS.
// Files and @font-face rules: public/fonts/web/ and src/styles/base/fonts.css.
const CRITICAL_FONTS = [
  '/fonts/web/manrope-latin-wght-normal.woff2',
  '/fonts/web/manrope-latin-ext-wght-normal.woff2',
  '/fonts/web/cormorant-garamond-latin-400-normal.woff2',
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  CRITICAL_FONTS.forEach((href) => preload(href, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' }));
  const settings = await getStoreSettings();
  const siteUrl = getSiteUrl();

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Pandiones',
    url: siteUrl,
    logo: `${siteUrl}/assets/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      email: settings.contactEmail,
      contactType: 'customer service',
      availableLanguage: 'Turkish',
    },
  };

  const webSiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Pandiones',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/arama?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="tr" className={logoFont.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(webSiteJsonLd) }}
        />
        {settings.googleAnalyticsId ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}`}
            />
            <script
              id="google-analytics"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${settings.googleAnalyticsId}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        ) : null}
      </head>
      <body>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <ScrollToTopOnNavigate />
              <SiteChrome>
                <a href="#main" className="skip-link">İçeriğe atla</a>
                <AnnouncementBar settings={settings} />
                <Header />
              </SiteChrome>
              {children}
              <SiteChrome>
                <Footer settings={settings} />
              </SiteChrome>
              <DeferredOverlays />
              <ToastNotification />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
