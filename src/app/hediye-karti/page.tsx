import React from 'react';
import { existsSync } from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import Reveal from '@/components/ui/Reveal';
import GiftCardFace, { MONOGRAM_PUBLIC_PATH } from './GiftCardFace';
import GiftCardBuilder from './GiftCardBuilder';
import BalanceCheck from './BalanceCheck';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/guides.css';
import '@/styles/pages/orders.css';
import '@/styles/pages/gift-card.css';

export const metadata = {
  title: 'Dijital Hediye Kartı — PANDIONES',
  description: 'Tutarını ve notunu seçtiğin dijital hediye kartı, ödeme onaylanınca alıcının e-postasına gönderilir. 12 ay geçerlidir.',
};

const STEPS = [
  { title: 'Tasarla', text: 'Kart tasarımını, tutarı ve kişisel notunu seç.' },
  { title: 'Öde', text: 'Kartı çantana ekle, siparişini her zamanki gibi tamamla.' },
  { title: 'Ulaşsın', text: 'Ödeme onaylanınca kod ve notun alıcının e-postasına gider.' },
];

const FACTS = ['12 ay geçerli', 'Parça parça harcanır', 'E-postayla ulaşır'];

export default function HediyeKartiPage() {
  const hasMonogram = existsSync(path.join(process.cwd(), 'public', MONOGRAM_PUBLIC_PATH));

  return (
    <main id="main" className="gift-page">
      <section className="gift-hero" aria-labelledby="gift-hero-title">
        <div className="gift-hero__inner">
          <div className="gift-hero__copy">
            <p className="gift-pill">Dijital hediye kartı</p>
            <h1 id="gift-hero-title" className="gift-hero__title">
              Seçimi <em>ona</em> bırakın.
            </h1>
            <p className="gift-hero__lead">
              Tutarı ve notu siz belirleyin; hangi parçanın onu mutlu edeceğine o karar versin. Kart pandiones.com&apos;daki tüm siparişlerde geçer.
            </p>
            <div className="gift-hero__actions">
              <a href="#hazirla" className="gift-cta">
                <span>Kartını hazırla</span>
                <span className="gift-cta__icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" focusable="false"><path d="M8 3v10M3.5 8.5L8 13l4.5-4.5" /></svg>
                </span>
              </a>
              <a href="#bakiye" className="guide-arrow-link">Bakiye sorgula</a>
            </div>
            <ul className="gift-hero__facts">
              {FACTS.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>

          <div className="gift-stack" aria-hidden="true">
            <div className="gift-stack__card gift-stack__card--back-left">
              <GiftCardFace theme="couture" amount={1000} recipientName="Deniz" senderName="Ece" hasMonogram={hasMonogram} />
            </div>
            <div className="gift-stack__card gift-stack__card--back-right">
              <GiftCardFace theme="rose" amount={5000} recipientName="Selin" senderName="Can" hasMonogram={hasMonogram} />
            </div>
            <div className="gift-stack__card gift-stack__card--front">
              <GiftCardFace theme="noir" amount={2500} recipientName="Aslı" senderName="Mert" hasMonogram={hasMonogram} />
            </div>
            <span className="gift-stack__floor" />
          </div>
        </div>
      </section>

      <div className="gift-body">
        <Reveal as="section" className="gift-steps" aria-labelledby="gift-steps-title">
          <h2 id="gift-steps-title" className="visually-hidden">Nasıl çalışır</h2>
          <ol className="gift-steps__list">
            {STEPS.map((step, index) => (
              <li key={step.title} style={{ '--i': index } as React.CSSProperties}>
                <span className="gift-steps__num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <section id="hazirla" className="gift-section" aria-labelledby="gift-builder-title">
          <Reveal className="gift-section__head">
            <p className="gift-pill">Kişiselleştir</p>
            <h2 id="gift-builder-title" className="gift-section__title">Kartını hazırla</h2>
          </Reveal>
          <GiftCardBuilder hasMonogram={hasMonogram} />
        </section>

        <section id="bakiye" className="gift-section gift-balance" aria-labelledby="balance-title">
          <Reveal className="gift-balance__intro">
            <p className="gift-pill">Kartın var mı?</p>
            <h2 id="balance-title" className="gift-section__title">Bakiye sorgula</h2>
            <p className="gift-balance__text">
              Kalan bakiyeyi ve son kullanma tarihini gör. Hesabına tanımlı kartlar <Link href="/hesabim#cuzdan">Cüzdan</Link>&apos;da da listelenir.
            </p>
          </Reveal>
          <Reveal className="bezel gift-balance__panel">
            <div className="bezel__core">
              <BalanceCheck />
            </div>
          </Reveal>
        </section>

        <aside className="guide-next" aria-label="Yardım">
          <p>Hediye kartıyla ilgili bir sorunuz mu var?</p>
          <div className="guide-next__links">
            <Link href="/yardim" className="guide-arrow-link">Sık sorulan sorular</Link>
            <Link href="/iletisim" className="guide-arrow-link">Bize yazın</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
