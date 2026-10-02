'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

/** Interactive parts of the footer; the rest of Footer.tsx is server-rendered and not hydrated. */

/* ── Segment label lookup ───────────────────────────────────────────────── */
const SEGMENT_LABELS: Record<string, string> = {
  '': 'Ana Sayfa',
  'urun': 'Ürün',
  'sepet': 'Sepet',
  'odeme': 'Ödeme',
  'siparis-onay': 'Sipariş Onayı',
  'siparis-takip': 'Sipariş Takibi',
  'siparislerim': 'Siparişlerim',
  'hesabim': 'Hesabım',
  'favorilerim': 'Favorilerim',
  'giris-yap': 'Giriş',
  'beden-rehberi': 'Beden Rehberi',
  'stil-rehberi': 'Stil Rehberi',
  'bakim-rehberi': 'Bakım Rehberi',
  'hediye-karti': 'Hediye Kartı',
  'yardim': 'Yardım & SSS',
  'iletisim': 'İletişim',
  'yonetim': 'Yönetim',
  'canta': 'Çanta',
  'ic-giyim': 'İç Giyim',
  'ev-giyim': 'Ev Giyim',
  'yeni-gelenler': 'Yeni Gelenler',
};

function slugToLabel(slug: string): string {
  if (SEGMENT_LABELS[slug]) return SEGMENT_LABELS[slug];
  // Capitalize and replace dashes with spaces for unknown slugs (product/category names)
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toLocaleUpperCase('tr-TR'));
}

export function FooterBreadcrumb() {
  const pathname = usePathname();

  if (!pathname || pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);

  // Build crumbs: [{ label, href }]
  const crumbs: { label: string; href: string }[] = [{ label: 'Ana Sayfa', href: '/' }];
  let accumulated = '';
  for (const seg of segments) {
    accumulated += `/${seg}`;
    crumbs.push({ label: slugToLabel(seg), href: accumulated });
  }

  return (
    <nav className="footer-breadcrumb" aria-label="Sayfa yolu">
      <ol>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.href}>
              {isLast ? (
                <span aria-current="page">{crumb.label}</span>
              ) : (
                <Link href={crumb.href}>{crumb.label}</Link>
              )}
              {!isLast && <span className="footer-breadcrumb-sep" aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


export function FooterNewsletter() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subMsg, setSubMsg] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setSubStatus('error');
      setSubMsg('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }

    setSubStatus('loading');
    setSubMsg('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubStatus('success');
        setSubMsg(data.message || 'Pandiones bültenine kaydınız alındı.');
        setEmail('');
      } else {
        setSubStatus('error');
        setSubMsg(data.error || 'Kayıt gerçekleştirilemedi.');
      }
    } catch {
      setSubStatus('error');
      setSubMsg('Bağlantı hatası oluştu.');
    }
  };

  return (
    <>
      <form onSubmit={handleSubscribe} className="newsletter-form" noValidate>
        {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
        <div className="form-trap" aria-hidden="true">
          <label htmlFor="newsletter-website">Web sitesi</label>
          <input id="newsletter-website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <div className="newsletter-input-group">
          <input
            className="newsletter-input"
            type="email"
            placeholder="E-posta adresiniz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={subStatus === 'loading'}
            required
            aria-label="Bülten e-posta adresi"
          />
          <button
            className="newsletter-btn"
            type="submit"
            disabled={subStatus === 'loading'}
            aria-label="Bültene abone ol"
          >
            <span className="btn-label">
              {subStatus === 'loading' ? 'Kaydediliyor...' : 'Kaydol'}
            </span>
            {subStatus !== 'loading' && (
              <span className="btn-arrow" aria-hidden="true">↗</span>
            )}
          </button>
        </div>
      </form>
      {subMsg && (
        <div
          className={`newsletter-alert ${subStatus === 'success' ? 'is-success' : 'is-error'}`}
          role="status"
        >
          <span className="alert-dot" aria-hidden="true" />
          <span>{subMsg}</span>
        </div>
      )}
    </>
  );
}

export function FooterLegalButton({ guide, children }: { guide: 'privacy' | 'terms'; children: React.ReactNode }) {
  const { setActiveGuide } = useCart();
  return (
    <button type="button" onClick={() => setActiveGuide(guide)} className="maison-legal-btn">
      {children}
    </button>
  );
}

export function FooterBackToTop() {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className="maison-back-to-top"
      aria-label="Sayfanın başına dön"
    >
      <span>Başa dön</span>
      <span className="back-arrow" aria-hidden="true">↑</span>
    </button>
  );
}
