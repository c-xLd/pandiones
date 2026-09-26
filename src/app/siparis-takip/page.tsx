'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productName: string;
  productSlug: string;
  productImage: string;
  category: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
}

interface OrderData {
  orderNumber: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  shippingCity: string;
  shippingDistrict: string;
  shippingAddressMasked: string;
  trackingCompany?: string | null;
  trackingCode?: string | null;
  items: OrderItem[];
}

const STATUS_STEPS = [
  { key: 'ALINDI', label: 'Sipariş Alındı', desc: 'Ödeme ve sipariş teyit edildi' },
  { key: 'HAZIRLANIYOR', label: 'Hazırlanıyor', desc: 'Özel lüks hediye kutusunda paketleniyor' },
  { key: 'KARGODA', label: 'Kargoya Verildi', desc: 'Transfer merkezinde dağıtıma çıktı' },
  { key: 'TESLIM_EDILDI', label: 'Teslim Edildi', desc: 'Siparişiniz alıcıya teslim edildi' },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'BEKLEMEDE':
      return 0;
    case 'HAZIRLANIYOR':
      return 1;
    case 'KARGODA':
      return 2;
    case 'TESLIM_EDILDI':
      return 3;
    case 'IPTAL_EDILDI':
      return -1;
    default:
      return 1;
  }
}

export default function SiparisTakipPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      setError('Lütfen sipariş numarası ve e-posta adresinizi eksiksiz giriniz.');
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          email: email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Sipariş bulunamadı. Lütfen bilgilerinizi kontrol edin.');
      }

      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || 'Sipariş sorgulanırken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stepIndex = order ? getStepIndex(order.status) : 0;
  const isCancelled = order?.status === 'IPTAL_EDILDI';

  return (
    <main id="main" className="padded-main guide-page">
      {/* ── Breadcrumb ── */}
      <div className="guide-breadcrumb">
        <nav aria-label="Ekmek kırıntısı">
          <Link href="/" className="apple-press">Ana Sayfa</Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: 'var(--ink)' }}>Sipariş Takibi</span>
        </nav>
      </div>

      {/* ── Hero ── */}
      <header className="guide-hero hero-entrance">
        <p className="guide-eyebrow">MÜŞTERİ HİZMETLERİ · ÇEVRİMİÇİ TAKİP</p>
        <h1 className="guide-title">
          Sipariş Durumu & Kargo Takibi
        </h1>
        <p className="guide-subtitle">
          Sipariş onay e-postanızda yer alan sipariş kodunu ve sipariş verdiğiniz e-posta adresini girerek 
          özel kutunuzun hazırlık ve transfer aşamalarını anlık izleyin.
        </p>
      </header>

      <div className="guide-content" style={{ maxWidth: '860px' }}>
        {/* Query Form */}
        <section
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: 'clamp(24px, 4vw, 36px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.03)',
            marginBottom: '40px',
          }}
          aria-label="Sipariş Sorgulama Formu"
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
              <div className="pandiones-field-wrap">
                <input
                  id="orderNumber"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  placeholder="PAN-XXXXXX"
                  className="pandiones-field"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}
                  required
                />
                <label htmlFor="orderNumber" className="pandiones-label">
                  Sipariş Numarası (Örn: PAN-260923-XXXX)
                </label>
              </div>

              <div className="pandiones-field-wrap">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@alanadi.com"
                  className="pandiones-field"
                  required
                />
                <label htmlFor="email" className="pandiones-label">
                  E-Posta Adresiniz
                </label>
              </div>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="submit"
                disabled={loading}
                className="apple-press"
                style={{
                  background: 'var(--ink)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '14px 32px',
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
                {loading ? 'Sorgulanıyor...' : 'Siparişi Sorgula →'}
              </button>
            </div>
          </form>

          {error && (
            <div
              style={{
                marginTop: '20px',
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
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Results Card */}
        {order && (
          <div className="stagger-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Order Summary & Status Card */}
            <div
              className="glass-surface"
              style={{
                border: '1px solid var(--line)',
                padding: 'clamp(24px, 4vw, 36px)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  borderBottom: '1px solid var(--line)',
                  paddingBottom: '24px',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
                    Sipariş Kodu
                  </span>
                  <p style={{ margin: '4px 0 2px', font: '600 22px monospace', color: 'var(--ink)' }}>
                    #{order.orderNumber}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                    {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
                    Toplam Tutar
                  </span>
                  <p style={{ margin: '4px 0 4px', font: '500 22px var(--serif)', color: 'var(--ink)' }}>
                    {order.totalAmount.toLocaleString('tr-TR')} ₺
                  </p>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}
                  >
                    {order.status === 'BEKLEMEDE' && 'Ödeme Teyit Edildi'}
                    {order.status === 'HAZIRLANIYOR' && 'Hazırlanıyor'}
                    {order.status === 'KARGODA' && 'Kargoya Verildi'}
                    {order.status === 'TESLIM_EDILDI' && 'Teslim Edildi'}
                    {order.status === 'IPTAL_EDILDI' && 'İptal Edildi'}
                  </span>
                </div>
              </div>

              {/* Status Timeline */}
              {isCancelled ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    background: 'rgba(239, 68, 68, 0.05)',
                    borderRadius: '8px',
                    margin: '24px 0',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#b91c1c' }}>Bu sipariş iptal edilmiştir.</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#991b1b' }}>
                    İade tutarınız bankanıza iletilmiştir. Detaylı bilgi için müşteri danışmanımızla iletişime geçebilirsiniz.
                  </p>
                </div>
              ) : (
                <div style={{ padding: '36px 0 16px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    {STATUS_STEPS.map((step, idx) => {
                      const isPast = idx <= stepIndex;
                      const isCurrent = idx === stepIndex;

                      return (
                        <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: isPast ? 'var(--ink)' : 'var(--surface)',
                              color: isPast ? '#fff' : 'var(--muted)',
                              border: isCurrent ? '3px solid var(--accent-gold)' : '1px solid var(--line)',
                              transition: 'all 0.3s ease',
                              marginBottom: '10px',
                            }}
                          >
                            {isPast ? '✓' : idx + 1}
                          </div>
                          <span style={{ fontSize: '12.5px', fontWeight: isPast ? 600 : 400, color: isPast ? 'var(--ink)' : 'var(--muted)' }}>
                            {step.label}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.3 }}>
                            {step.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shipping Carrier Card */}
              {order.trackingCode && (
                <div
                  style={{
                    marginTop: '24px',
                    padding: '16px 20px',
                    background: 'var(--surface)',
                    borderRadius: '10px',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>📦</span>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                        Kargo Firması: {order.trackingCompany || 'Yurtiçi Kargo'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', fontFamily: 'monospace', color: 'var(--muted)' }}>
                        Takip Kodu: {order.trackingCode}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(order.trackingCode || '')}
                      className="apple-press"
                      style={{
                        padding: '8px 16px',
                        background: 'var(--paper)',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        color: 'var(--ink)',
                      }}
                    >
                      {copied ? 'Kopyalandı ✓' : 'Kodu Kopyala'}
                    </button>
                    {order.trackingCompany?.toLowerCase().includes('yurtici') ? (
                      <a
                        href={`https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${order.trackingCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="apple-press"
                        style={{
                          padding: '8px 16px',
                          background: 'var(--ink)',
                          color: '#fff',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        Kargo Sitesinde Gör ↗
                      </a>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Items in Order */}
            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                padding: 'clamp(20px, 3.5vw, 32px)',
              }}
            >
              <h2 style={{ font: '400 20px var(--serif)', color: 'var(--ink)', margin: '0 0 20px' }}>
                Siparişteki Parçalar ({order.items.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          style={{ width: '64px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--line)' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '64px',
                            height: '80px',
                            background: 'var(--surface)',
                            borderRadius: '6px',
                            border: '1px solid var(--line)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: 'var(--muted)',
                          }}
                        >
                          Görsel
                        </div>
                      )}
                      <div>
                        {item.productSlug ? (
                          <Link
                            href={`/urunler/${item.productSlug}`}
                            style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}
                          >
                            {item.productName}
                          </Link>
                        ) : (
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{item.productName}</p>
                        )}
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Renk: {item.color || 'Belirtilmemiş'} · Beden: {item.size}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>Adet: {item.quantity}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, font: '500 16px var(--serif)', color: 'var(--ink)' }}>
                        {(item.price * item.quantity).toLocaleString('tr-TR')} ₺
                      </p>
                      {item.quantity > 1 && (
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
                          {item.price.toLocaleString('tr-TR')} ₺ / adet
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Address Summary */}
              <div
                style={{
                  marginTop: '20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  fontSize: '12.5px',
                  color: 'var(--muted)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    Teslimat Adresi:
                  </span>
                  <p style={{ margin: 0 }}>{order.shippingAddressMasked}</p>
                  <p style={{ margin: '2px 0 0' }}>
                    {order.shippingDistrict} / {order.shippingCity}
                  </p>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                    Lüks Hediye Paketi:
                  </span>
                  <p style={{ margin: 0 }}>Pandiones mühürlü lüks kutu ve ipek kurdele ile hazırlanmaktadır.</p>
                </div>
              </div>
            </div>

            {/* Quick Action Help */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                padding: '24px 28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <p style={{ margin: 0, font: '500 16px var(--serif)', color: 'var(--ink)' }}>
                  Siparişinizle ilgili özel bir talebiniz mi var?
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                  Teslimat adresi değişikliği veya hediye notu ekleme için müşteri danışmanımıza ulaşın.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  href="/iletisim"
                  className="apple-press"
                  style={{
                    padding: '10px 20px',
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color: 'var(--ink)',
                    textDecoration: 'none',
                  }}
                >
                  Müşteri Danışmanı ↗
                </Link>
                <a
                  href="https://wa.me/908500000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-press"
                  style={{
                    padding: '10px 20px',
                    background: '#25D366',
                    color: '#fff',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  WhatsApp Destek
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
