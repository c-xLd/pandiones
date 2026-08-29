import type { Metadata } from 'next';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import CartIntroSection from '@/components/sepet/cart-intro-section';
import CartContentSection from '@/components/sepet/cart-content-section';

export const metadata: Metadata = { 
  title: 'Alışveriş Çantası | Pandiones', 
  robots: { index: false, follow: false } 
};

export default function CartPage() {
  return (
    <main className="shop-page cart-page-v2">
      <SiteHeader />
      <CartIntroSection />
      <CartContentSection />
      <SiteFooter />
    </main>
  );
}
