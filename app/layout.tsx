import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://pandiones.com'),
  title: 'Pandiones — Kadın İç Giyim ve Crop Büstiyer',
  description: 'Pandiones sütyen takımları, crop büstiyerler, gecelik ve babydoll koleksiyonunu keşfet.',
  openGraph: {
    title: 'Pandiones — Kendin Gibi',
    description: 'Dantelli takımlar, crop büstiyerler ve geceliklerle her haline eşlik eden koleksiyon.',
    images: [{ url: '/og.png', width: 1536, height: 864, alt: 'Pandiones kadın iç giyim koleksiyonu' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pandiones — Kendin Gibi',
    description: 'Dantelli takımlar, crop büstiyerler ve geceliklerle her haline eşlik eden koleksiyon.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
