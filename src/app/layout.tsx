import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource-variable/manrope/wght.css';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MenuModal from '@/components/modals/MenuModal';
import SearchModal from '@/components/modals/SearchModal';
import BagDrawer from '@/components/modals/BagDrawer';
import ProductQuickView from '@/components/modals/ProductQuickView';
import GuideModals from '@/components/modals/GuideModals';
import ToastNotification from '@/components/layout/ToastNotification';

const logoFont = localFont({
  src: [
    {
      path: '../../public/fonts/MontserratAlt1-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/MontserratAlt1-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/MontserratAlt1-SemiBold.otf',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-logo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PANDIONES — Görünmeyen zarafet',
  description:
    'Pandiones iç giyim koleksiyonu. Zarif dantel, saten dokular ve kendine ayırdığın anlar.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23f5f2ec'/%3E%3Ctext x='10' y='30' font-size='30' fill='%232d2924'%3EP%3C/text%3E%3C/svg%3E",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={logoFont.variable}>
      <body>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <Header />
              {children}
              <Footer />
              <MenuModal />
              <SearchModal />
              <BagDrawer />
              <ProductQuickView />
              <GuideModals />
              <ToastNotification />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
