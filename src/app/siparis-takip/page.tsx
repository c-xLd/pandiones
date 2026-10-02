import React from 'react';
import Link from 'next/link';
import GuideHero from '@/components/guides/GuideHero';
import TrackClient from './TrackClient';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/guides.css';
import '@/styles/pages/orders.css';

export const metadata = {
  title: 'Sipariş Takibi — PANDIONES',
  description: 'Sipariş numaranız ve e-posta adresinizle siparişinizin durumunu ve kargo takip kodunu görün.',
};

export default function SiparisTakipPage() {
  return (
    <main id="main" className="guide-page guide-page--narrow">
      <GuideHero
        eyebrow="Müşteri hizmetleri"
        title="Sipariş takibi"
        lead="Sipariş numaranızı ve siparişte kullandığınız e-postayı girin; siparişin hangi aşamada olduğunu ve kargo takip kodunu gösterelim."
        aside={
          <div className="guide-aside-note">
            <p className="guide-jump__title">Hesabınız var mı?</p>
            <p>Tüm siparişleriniz, iade talepleri ve sipariş özetleri hesabınızda.</p>
            <Link href="/siparislerim" className="guide-arrow-link">Siparişlerim</Link>
          </div>
        }
      />
      <TrackClient />
    </main>
  );
}
