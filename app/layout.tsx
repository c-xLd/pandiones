import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pandiones — Living Fabric',
  description: 'Formunuzla hareket eden yeni Pandiones koleksiyonunu keşfedin.',
  openGraph: {
    title: 'Pandiones — Living Fabric',
    description: 'Kumaşın hareketinden doğan sinematik alışveriş deneyimi.',
    images: [{ url: '/og.png', width: 1536, height: 864, alt: 'Pandiones Living Fabric' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pandiones — Living Fabric',
    description: 'Kumaşın hareketinden doğan sinematik alışveriş deneyimi.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
