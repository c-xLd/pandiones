'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const SUBJECT_OPTIONS = [
  'Sipariş & Kargo Durumu',
  'İade & Değişim Talebi',
  'Beden & Kalıp Danışmanlığı',
  'Hediye Paketi & Özel Not',
  'Hediye Kartı İşlemleri',
  'Toptan & İş Ortaklığı',
  'Genel Danışmanlık',
];

export default function IletisimPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    orderNumber: '',
    subject: 'Genel Danışmanlık',
    message: '',
    kvkkConsent: false,
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setErrorMsg('Lütfen adınızı ve soyadınızı giriniz.');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMsg('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setErrorMsg('Lütfen en az 10 karakterlik açıklayıcı bir mesaj giriniz.');
      return;
    }

    if (!formData.kvkkConsent) {
      setErrorMsg('Devam etmek için kişisel verilerin korunması aydınlatma metnini onaylamanız gerekmektedir.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Mesajınız iletilemedi. Lütfen tekrar deneyin.');
      }

      setSuccessMsg(data.message || 'Mesajınız başarıyla iletildi. En kısa sürede sizinle iletişime geçeceğiz.');
      setFormData({
        name: '',
        email: '',
        phone: '',
        orderNumber: '',
        subject: 'Genel Danışmanlık',
        message: '',
        kvkkConsent: false,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="padded-main guide-page">
      {/* ── Breadcrumb ── */}
      <div className="guide-breadcrumb">
        <nav aria-label="Ekmek kırıntısı">
          <Link href="/" className="apple-press">Ana Sayfa</Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: 'var(--ink)' }}>İletişim & Danışmanlık</span>
        </nav>
      </div>

      {/* ── Hero ── */}
      <header className="guide-hero hero-entrance">
        <p className="guide-eyebrow">MÜŞTERİ HİZMETLERİ · BİZE ULAŞIN</p>
        <h1 className="guide-title">
          İletişim & Kişisel Danışmanlık
        </h1>
        <p className="guide-subtitle">
          Kusursuz beden seçimi, stil önerileri, sipariş süreci veya özel hediye talepleriniz için 
          müşteri danışmanlarımız size eşlik etmekten memnuniyet duyar.
        </p>
      </header>

      <div className="guide-content">
        {/* Contact Channels Grid */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '48px',
          }}
          aria-label="İletişim Kanalları"
        >
          {/* Channel 1 */}
          <div
            className="guide-card"
            style={{
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  marginBottom: '16px',
                }}
              >
                💬
              </div>
              <h2 style={{ font: '400 18px var(--serif)', color: 'var(--ink)', margin: '0 0 8px' }}>
                WhatsApp Danışma Hattı
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
                Hafta içi 09:00 – 18:00 saatleri arasında anlık beden ve ürün danışmanlığı hizmeti alın.
              </p>
            </div>
            <div>
              <a
                href="https://wa.me/908500000000"
                target="_blank"
                rel="noopener noreferrer"
                className="guide-cta-link apple-press"
                style={{ margin: 0 }}
              >
                WhatsApp Sohbeti Başlat
              </a>
            </div>
          </div>

          {/* Channel 2 */}
          <div
            className="guide-card"
            style={{
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  marginBottom: '16px',
                }}
              >
                ✉️
              </div>
              <h2 style={{ font: '400 18px var(--serif)', color: 'var(--ink)', margin: '0 0 8px' }}>
                E-Posta İle İletişim
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
                Tüm yazılı soru, talep ve iade bildirimleriniz 24 saat içinde yanıtlanır.
              </p>
            </div>
            <div>
              <a
                href="mailto:destek@pandiones.com"
                className="guide-cta-link apple-press"
                style={{ margin: 0 }}
              >
                destek@pandiones.com
              </a>
            </div>
          </div>

          {/* Channel 3 */}
          <div
            className="guide-card"
            style={{
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  marginBottom: '16px',
                }}
              >
                ✨
              </div>
              <h2 style={{ font: '400 18px var(--serif)', color: 'var(--ink)', margin: '0 0 8px' }}>
                Hızlı Çözüm Merkezi
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
                Siparişinizi sorgulamak veya sıkça sorulan sorulara göz atmak için rehberlerimizi inceleyin.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <Link href="/siparis-takip" className="guide-cta-link apple-press" style={{ margin: 0 }}>
                Sipariş Takip
              </Link>
              <Link href="/yardim" className="guide-cta-link apple-press" style={{ margin: 0 }}>
                Yardım SSS
              </Link>
            </div>
          </div>
        </section>

        {/* Main Form Box */}
        <section
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: 'clamp(28px, 4vw, 44px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.03)',
          }}
          aria-label="İletişim ve Danışmanlık Formu"
        >
          <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '20px', marginBottom: '32px' }}>
            <h2 style={{ font: '400 24px var(--serif)', color: 'var(--ink)', margin: '0 0 8px' }}>
              İletişim & Danışmanlık Formu
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
              Formu eksiksiz doldurarak talebinizi bize iletebilirsiniz. Ekibimiz sizinle en kısa sürede iletişime geçecektir.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
              <div className="pandiones-field-wrap">
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Adınız Soyadınız"
                  className="pandiones-field"
                  required
                />
                <label htmlFor="name" className="pandiones-label">
                  Adınız ve Soyadınız *
                </label>
              </div>

              <div className="pandiones-field-wrap">
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ornek@alanadi.com"
                  className="pandiones-field"
                  required
                />
                <label htmlFor="email" className="pandiones-label">
                  E-Posta Adresiniz *
                </label>
              </div>

              <div className="pandiones-field-wrap">
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="05XX XXX XX XX"
                  className="pandiones-field"
                />
                <label htmlFor="phone" className="pandiones-label">
                  Telefon Numaranız (İsteğe Bağlı)
                </label>
              </div>

              <div className="pandiones-field-wrap">
                <input
                  id="orderNumber"
                  type="text"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value.toUpperCase() })}
                  placeholder="PAN-XXXXXX"
                  className="pandiones-field"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
                <label htmlFor="orderNumber" className="pandiones-label">
                  Sipariş Numarası (Varsa)
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label htmlFor="subject" style={{ display: 'block', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600 }}>
                Mesaj Konusu *
              </label>
              <select
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="apple-press"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              >
                {SUBJECT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="pandiones-field-wrap" style={{ marginBottom: '28px' }}>
              <textarea
                id="message"
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Mesajınız..."
                className="pandiones-field"
                style={{ resize: 'vertical' }}
                required
              />
              <label htmlFor="message" className="pandiones-label">
                Mesajınız (En az 10 karakter) *
              </label>
            </div>

            {/* KVKK Custom Checkbox */}
            <div style={{ marginBottom: '28px' }}>
              <label className="pandiones-checkbox-wrap">
                <input
                  id="kvkk"
                  type="checkbox"
                  checked={formData.kvkkConsent}
                  onChange={(e) => setFormData({ ...formData, kvkkConsent: e.target.checked })}
                  className="pandiones-checkbox"
                  required
                />
                <span className="pandiones-checkbox-label">
                  Kişisel verilerimin, talebimin yanıtlanması ve müşteri memnuniyeti süreçlerinin yürütülmesi amacıyla işlenmesini ve{' '}
                  <Link href="/yardim" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                    Aydınlatma Metni
                  </Link>
                  &apos;ni okuduğumu ve kabul ettiğimi beyan ederim.
                </span>
              </label>
            </div>

            {/* Error and Success Alerts */}
            {errorMsg && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '14px 18px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span aria-hidden="true">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '14px 18px',
                  background: 'rgba(22, 163, 74, 0.05)',
                  border: '1px solid rgba(22, 163, 74, 0.25)',
                  borderRadius: '8px',
                  color: '#15803d',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span aria-hidden="true">✓</span>
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="apple-press"
                style={{
                  background: 'var(--ink)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '14px 36px',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {loading ? 'Gönderiliyor...' : 'Mesajı İlet →'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
