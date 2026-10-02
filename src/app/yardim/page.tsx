import React from 'react';
import Link from 'next/link';
import GuideHero from '@/components/guides/GuideHero';
import FaqClient from './FaqClient';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/guides.css';

export const metadata = {
  title: 'Yardım ve Sıkça Sorulan Sorular — PANDIONES',
  description: 'Teslimat, iade, ödeme, beden ve hediye kartı hakkında sık sorulan soruların yanıtları.',
};

const SHORTCUTS = [
  { href: '/siparis-takip', title: 'Sipariş takibi', text: 'Numaran ve e-postanla siparişini bul.' },
  { href: '/beden-rehberi', title: 'Beden rehberi', text: 'Ölçünü gir, bedenini öğren.' },
  { href: '/iletisim', title: 'Bize yaz', text: 'Yanıtı burada yoksa mesaj bırak.' },
];

export default function YardimPage() {
  return (
    <main id="main" className="guide-page">
      <GuideHero
        eyebrow="Müşteri hizmetleri"
        title="Nasıl yardımcı olabiliriz?"
        lead="Teslimat, iade, ödeme, beden ve hediye kartıyla ilgili en çok sorulanlar. Aradığınızı bulamazsanız bize yazın."
      />

      <nav className="help-shortcuts" aria-label="Kısayollar">
        {SHORTCUTS.map((item) => (
          <Link key={item.href} href={item.href} className="help-shortcut">
            <span className="help-shortcut__title">{item.title}</span>
            <span className="help-shortcut__text">{item.text}</span>
            <span className="help-shortcut__arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </nav>

      <section className="guide-section guide-section--stacked" aria-labelledby="faq-title">
        <h2 id="faq-title" className="guide-section__title">Sık sorulan sorular</h2>
        <FaqClient />
      </section>
    </main>
  );
}
