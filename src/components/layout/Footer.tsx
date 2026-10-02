import React from 'react';
import Link from 'next/link';
import { FooterBackToTop, FooterBreadcrumb, FooterLegalButton, FooterNewsletter } from './FooterIslands';
import { whatsappHref, type StoreSettings } from '@/lib/settings/shared';

/** Server component: only the newsletter form and the three buttons hydrate (FooterIslands.tsx).
 *  Contact channels, social links and the store name come from Yönetim → Ayarlar; unset ones are not shown. */
export default function Footer({ settings }: { settings: StoreSettings }) {
  const whatsapp = whatsappHref(settings.whatsappNumber);
  const social = [
    { label: 'Instagram', href: settings.instagramUrl },
    { label: 'TikTok', href: settings.tiktokUrl },
    { label: 'Pinterest', href: settings.pinterestUrl },
  ].filter((item): item is { label: string; href: string } => Boolean(item.href));
  return (
    <footer className="maison-footer" aria-label="Pandiones alt bilgi">
      <div className="maison-footer-inner">
        <div className="maison-footer-main">
          {/* Brand Colophon */}
          <div className="maison-footer-brand">
            <p className="maison-footer-statement">
              Görünmeyen<br />
              <em>zarafet.</em>
            </p>
          </div>

          {/* Newsletter Column */}
          <div className="maison-footer-newsletter" aria-labelledby="footer-newsletter">
            <h2 id="footer-newsletter">Özel Davetler &amp; Bülten</h2>
            <p className="maison-footer-newsletter-desc">
              Yeni koleksiyon lansmanları, sınırlı üretim seriler ve özel seçkilerden ilk siz haberdar olun.
            </p>
            <FooterNewsletter />
          </div>

          {/* Navigation Links */}
          <div className="maison-footer-links">
            <nav aria-labelledby="footer-world" className="maison-nav-group">
              <h2 id="footer-world">Rehberler</h2>
              <Link href="/beden-rehberi">Beden rehberi</Link>
              <Link href="/stil-rehberi">Stil rehberi</Link>
              <Link href="/bakim-rehberi">Bakım rehberi</Link>
              <Link href="/#hikayemiz">Hikâyemiz</Link>
            </nav>
            <nav aria-labelledby="footer-support" className="maison-nav-group">
              <h2 id="footer-support">Müşteri Hizmetleri</h2>
              <Link href="/siparis-takip">Sipariş takibi</Link>
              <Link href="/yardim">Yardım &amp; SSS</Link>
              <Link href="/iletisim">İletişim &amp; Danışma</Link>
            </nav>
            <nav aria-labelledby="footer-contact" className="maison-nav-group">
              <h2 id="footer-contact">Bize ulaşın</h2>
              <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
              {settings.contactPhone ? <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, '')}`}>{settings.contactPhone}</a> : null}
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  WhatsApp<span className="visually-hidden"> (yeni sekmede açılır)</span>
                </a>
              ) : null}
              {social.map((item) => (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">
                  {item.label}<span className="visually-hidden"> (yeni sekmede açılır)</span>
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Dynamic Breadcrumb */}
        <FooterBreadcrumb />

        {/* Monogram Colophon Banner */}
        <Link href="/" className="maison-monogram" aria-label="Pandiones ana sayfa">
          PANDIONES
        </Link>

        {/* Base Meta Bar */}
        <div className="maison-footer-base">
          <div className="maison-footer-meta">
            <span className="tabular-year">© {new Date().getFullYear()} {settings.storeName}</span>
            <span className="meta-sep" aria-hidden="true">·</span>
            <FooterLegalButton guide="privacy">Gizlilik &amp; KVKK</FooterLegalButton>
            <span className="meta-sep" aria-hidden="true">·</span>
            <FooterLegalButton guide="terms">Koşullar</FooterLegalButton>
          </div>

          <div className="maison-footer-locale">
            <span className="locale-tag">TR / TRY</span>
            <span className="meta-sep" aria-hidden="true">·</span>
            <FooterBackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
