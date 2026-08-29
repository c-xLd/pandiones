import type { Metadata } from 'next';
import CartView from '@/components/cart-view';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';

export const metadata: Metadata = { title: 'Alışveriş Çantası | Pandiones', robots: { index: false, follow: false } };

export default function CartPage() {
  return <main className="shop-page cart-page-v2"><SiteHeader /><section className="cart-intro-v2"><div><p>ALIŞVERİŞ ÇANTASI</p><h1>Seçimlerin.</h1></div><ol aria-label="Sipariş adımları"><li className="active"><span>01</span>Çanta</li><li><span>02</span>Teslimat</li><li><span>03</span>Ödeme</li></ol></section><section className="cart-content-v2"><CartView /></section><SiteFooter /></main>;
}
