import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, verifyOrderGuestToken } from '@/lib/auth';
import OrderSuccessClearCart from './OrderSuccessClearCart';
import OrderPrintButton from './OrderPrintButton';

export const dynamic = 'force-dynamic';

export default async function SiparisOnayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id }, { orderNumber: id }],
    },
    include: {
      items: true,
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Verify access authorization
  const session = await getCurrentUser();
  const isAdmin = session?.role === 'ADMIN';
  const isOwner = Boolean(
    session?.userId && order.userId && session.userId === order.userId
  );
  const isVerifiedGuest = Boolean(
    token && verifyOrderGuestToken(order.orderNumber, token)
  );

  if (!isAdmin && !isOwner && !isVerifiedGuest) {
    return (
      <main id="main" className="padded-main">
        <div
          style={{
            maxWidth: '580px',
            margin: '80px auto',
            textAlign: 'center',
            padding: '0 20px',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ font: '400 32px var(--serif)', marginBottom: '16px' }}>
            Erişim Yetkisi Gerekli
          </h1>
          <p
            style={{
              color: 'var(--muted)',
              marginBottom: '32px',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            Bu siparişin detaylarını ve kişisel teslimat bilgilerini görüntülemek
            için siparişi veren hesapla giriş yapmanız veya sipariş onay
            bağlantısını kullanmanız gerekmektedir.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link href="/giris-yap" className="btn btn--primary btn--lg btn--block">
              Giriş Yap ↗
            </Link>
            <Link
              href="/koleksiyon"
              className="btn btn--secondary btn--lg btn--block"
            >
              Koleksiyona Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Check if payment is confirmed
  const isPaymentConfirmed =
    order.status === 'ODENDI' ||
    order.status === 'HAZIRLANIYOR' ||
    order.status === 'KARGODA' ||
    order.status === 'TESLIM_EDILDI';

  if (!isPaymentConfirmed) {
    const isFailed = order.status === 'ODEME_BASARISIZ';
    return (
      <main id="main" className="padded-main">
        <div
          style={{
            maxWidth: '580px',
            margin: '80px auto',
            textAlign: 'center',
            padding: '0 20px',
          }}
        >
          <div
            style={{
              fontSize: '40px',
              marginBottom: '16px',
              color: isFailed ? '#dc2626' : '#d97706',
            }}
          >
            {isFailed ? '✕' : '⏳'}
          </div>
          <p className="eyebrow">PANDIONES</p>
          <h1 style={{ font: '400 32px var(--serif)', marginBottom: '16px' }}>
            {isFailed ? 'Ödeme Onaylanamadı' : 'Ödeme Bekleniyor'}
          </h1>
          <p
            style={{
              color: 'var(--muted)',
              marginBottom: '32px',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            {isFailed
              ? 'Siparişiniz için bankanızdan ödeme onayı alınamadı. Kart bilgilerinizi kontrol ederek lütfen tekrar deneyiniz.'
              : 'Siparişinizin ödeme doğrulaması henüz tamamlanmadı. İşleminizi tamamlamak için ödeme adımına ilerleyebilirsiniz.'}
          </p>
          <Link
            href="/odeme"
            className="btn btn--primary btn--lg btn--block"
          >
            {isFailed ? 'Ödemeyi Tekrar Dene ↗' : 'Ödeme Adımına Git ↗'}
          </Link>
        </div>
      </main>
    );
  }

  const latestTransaction = order.transactions?.[0];

  const money = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <main id="main" className="padded-main">
      <OrderSuccessClearCart />
      <div className="order-success-page">
        <div className="order-success-seal">✓</div>
        <p className="eyebrow">PANDIONES</p>
        <h1>Siparişiniz Alındı</h1>
        <p className="order-success-desc">
          Teşekkür ederiz{order.customerName ? `, ${order.customerName}` : ''}.
          Siparişiniz onaylandı ve özel hediye kutusunda titizlikle hazırlanmaya
          başladı.
        </p>

        <div className="order-receipt-box">
          <div className="receipt-header">
            <div>
              <strong>Sipariş No:</strong> {order.orderNumber}
            </div>
            <div>
              <strong>Durum:</strong>{' '}
              {order.status === 'KARGODA'
                ? 'Kargoya Verildi'
                : order.status === 'TESLIM_EDILDI'
                ? 'Teslim Edildi'
                : 'Ödeme Onaylandı'}
            </div>
          </div>

          {/* Ödeme Bilgileri Rozeti */}
          <div
            style={{
              margin: '16px 0',
              padding: '12px 16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '3px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <span style={{ color: '#166534', fontWeight: 600 }}>
                🔒 iyzico 3D Secure ile Güvenli Ödendi
              </span>
              {latestTransaction?.lastFourDigits && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#15803d',
                    marginTop: '3px',
                  }}
                >
                  {latestTransaction.cardFamily ||
                    latestTransaction.cardAssociation ||
                    'Kart'}{' '}
                  ···· {latestTransaction.lastFourDigits}
                  {latestTransaction.installment > 1
                    ? ` (${latestTransaction.installment} Taksit)`
                    : ' (Tek Çekim)'}
                </div>
              )}
            </div>
            <span
              style={{
                fontSize: '11px',
                color: '#166534',
                background: '#dcfce7',
                padding: '3px 8px',
                borderRadius: '3px',
              }}
            >
              Banka Onaylı
            </span>
          </div>

          {order.trackingCode && (
            <div
              style={{
                margin: '16px 0',
                padding: '12px 16px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span>
                🚚 <strong>{order.trackingCompany || 'Kargo Firması'}:</strong>{' '}
                Takip No: <code>{order.trackingCode}</code>
              </span>
              <span
                style={{ fontSize: '12px', fontWeight: 600, color: '#1d4ed8' }}
              >
                Kargo Takibi
              </span>
            </div>
          )}

          <div style={{
            marginBottom: '20px',
            background: 'var(--surface)',
            padding: '18px 20px',
            borderRadius: '8px',
            border: '1px solid var(--line)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <h4
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  margin: 0,
                  color: 'var(--muted)',
                }}
              >
                TESLİMAT BİLGİLERİ VE KONUM
              </h4>

              {/* Direct Turn-by-Turn Google Maps Navigation Links */}
              <div style={{ display: 'flex', gap: '8px' }} className="print-hide">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${order.shippingAddress}, ${order.shippingDistrict}, ${order.shippingCity}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-press"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '5px 12px',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    borderRadius: '9999px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span>🧭</span> Navigasyon Başlat ↗
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.shippingAddress}, ${order.shippingDistrict}, ${order.shippingCity}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-press"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '5px 12px',
                    background: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '9999px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span>🗺️</span> Haritada Gör ↗
                </a>
              </div>
            </div>

            <p
              style={{
                fontSize: '14px',
                fontWeight: 600,
                margin: '0 0 4px',
                color: 'var(--ink)',
              }}
            >
              {order.customerName} {order.customerPhone ? `· ${order.customerPhone}` : ''}
            </p>
            <p
              style={{
                fontSize: '13px',
                margin: 0,
                color: 'var(--ink)',
                lineHeight: 1.5,
              }}
            >
              {order.shippingAddress}, {order.shippingDistrict} / {order.shippingCity}
            </p>
          </div>

          {order.items && order.items.length > 0 && (
            <div
              style={{
                borderTop: '1px solid var(--line)',
                paddingTop: '16px',
                marginBottom: '16px',
              }}
            >
              <h4
                style={{
                  fontSize: '13px',
                  letterSpacing: '0.05em',
                  marginBottom: '12px',
                }}
              >
                SATIN ALINAN PARÇALAR
              </h4>
              {order.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    marginBottom: '8px',
                  }}
                >
                  <span>
                    <strong className="order-product-name">
                      {item.productName}
                    </strong>{' '}
                    (Beden: {item.size}) × {item.quantity}
                  </span>
                  <span>{money(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              borderTop: '1px solid var(--line)',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 500,
              fontSize: '15px',
            }}
          >
            <span>Ödenen Tutar</span>
            <span>{order.totalAmount ? money(order.totalAmount) : '—'}</span>
          </div>

          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }} className="print-hide">
            <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🛡️</span>
              <span>Sigortalı VIP Kurye Teslimatı (2-3 İş Günü)</span>
            </div>
            <OrderPrintButton />
          </div>
        </div>

        <Link
          href="/koleksiyon"
          className="btn btn--primary btn--lg btn--block print-hide"
        >
          Koleksiyonu Keşfetmeye Devam Et ↗
        </Link>
      </div>

      <style>{`
        @media print {
          header, footer, nav, .print-hide {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .order-receipt-box {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}
