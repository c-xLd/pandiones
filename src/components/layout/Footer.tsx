'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function Footer() {
  const { setActiveGuide } = useCart();
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subMsg, setSubMsg] = useState('');

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        body: JSON.stringify({ email }),
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
            <form onSubmit={handleSubscribe} className="newsletter-form" noValidate>
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
          </div>
        </div>

        {/* Monogram Colophon Banner */}
        <Link href="/" className="maison-monogram" aria-label="Pandiones ana sayfa">
          PANDIONES
        </Link>

        {/* Base Meta Bar */}
        <div className="maison-footer-base">
          <div className="maison-footer-meta">
            <span className="tabular-year">© 2026 Pandiones</span>
            <span className="meta-sep" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveGuide('privacy')}
              className="maison-legal-btn"
            >
              Gizlilik &amp; KVKK
            </button>
            <span className="meta-sep" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveGuide('terms')}
              className="maison-legal-btn"
            >
              Koşullar
            </button>
          </div>

          <div className="maison-footer-locale">
            <span className="locale-tag">TR / TRY</span>
            <span className="meta-sep" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={scrollToTop}
              className="maison-back-to-top"
              aria-label="Sayfanın başına dön"
            >
              <span>Başa dön</span>
              <span className="back-arrow" aria-hidden="true">↑</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
