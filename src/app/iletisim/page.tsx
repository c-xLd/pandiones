import React from 'react';
import Link from 'next/link';
import GuideHero from '@/components/guides/GuideHero';
import { whatsappHref } from '@/lib/settings/shared';
import { getStoreSettings } from '@/lib/settings/server';
import ContactForm from './ContactForm';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/guides.css';

export const metadata = {
  title: 'İletişim — PANDIONES',
  description: 'Sipariş, iade, beden ve hediye kartı sorularınız için Pandiones müşteri hizmetlerine yazın.',
};

/** Channels come from Yönetim → Ayarlar; an unset phone or WhatsApp is not shown. */
export default async function IletisimPage() {
  const settings = await getStoreSettings();
  const supportEmail = settings.contactEmail;
  const whatsapp = whatsappHref(settings.whatsappNumber);

  return (
    <main id="main" className="guide-page">
      <GuideHero
        eyebrow="Müşteri hizmetleri"
        title="Bize yazın"
        lead="Sipariş, iade, beden seçimi ya da hediye kartı; sorunuz ne olursa olsun mesajınızı okuyup e-postayla yanıtlıyoruz."
      />

      <div className="contact-layout">
        <aside className="contact-channels" aria-label="Diğer iletişim yolları">
          <dl className="contact-channels__list">
            <div>
              <dt>E-posta</dt>
              <dd>
                <a href={`mailto:${supportEmail}`} className="contact-channels__value">{supportEmail}</a>
              </dd>
            </div>
            {settings.contactPhone ? (
              <div>
                <dt>Telefon</dt>
                <dd>
                  <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, '')}`} className="contact-channels__value">{settings.contactPhone}</a>
                </dd>
              </div>
            ) : null}
            {whatsapp ? (
              <div>
                <dt>WhatsApp</dt>
                <dd>
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="contact-channels__value">
                    Sohbet başlat<span className="visually-hidden"> (yeni sekmede açılır)</span>
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="contact-channels__help">
            <p className="guide-jump__title">Önce buraya bakın</p>
            <ul>
              <li><Link href="/siparis-takip" className="guide-arrow-link">Sipariş takibi</Link></li>
              <li><Link href="/yardim" className="guide-arrow-link">Sık sorulan sorular</Link></li>
              <li><Link href="/beden-rehberi" className="guide-arrow-link">Beden rehberi</Link></li>
            </ul>
          </div>
        </aside>

        <ContactForm supportEmail={supportEmail} />
      </div>
    </main>
  );
}
