import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://pandiones.com'),
  title: 'Pandiones — Kadın İç Giyim ve Crop Büstiyer',
  description: 'Pandiones sütyen takımları, crop büstiyerler, gecelik ve babydoll koleksiyonunu keşfet.',
  keywords: ['iç giyim', 'kadın büstiyer', 'crop büstiyer', 'gecelik', 'babydoll', 'pandiones', 'sütyen takımı'],
  authors: [{ name: 'Pandiones' }],
  openGraph: {
    title: 'Pandiones — Kendin Gibi',
    description: 'Dantelli takımlar, crop büstiyerler ve geceliklerle her haline eşlik eden koleksiyon.',
    url: 'https://pandiones.com',
    siteName: 'Pandiones',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: '/og.png', width: 1536, height: 864, alt: 'Pandiones kadın iç giyim koleksiyonu' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pandiones — Kendin Gibi',
    description: 'Dantelli takımlar, crop büstiyerler ve geceliklerle her haline eşlik eden koleksiyon.',
    images: ['/og.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://eryhwjndozjpifbizsnw.supabase.co" crossOrigin="" />
        <link rel="dns-prefetch" href="https://eryhwjndozjpifbizsnw.supabase.co" />
        <link
          rel="preload"
          href="/fonts/MontserratAlt1-Light.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
