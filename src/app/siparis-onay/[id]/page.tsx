import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasGuestOrderAccess } from '@/lib/auth';
import OrderSuccessClearCart from './OrderSuccessClearCart';
import OrderPrintButton from './OrderPrintButton';
// Route stylesheets
import '@/styles/pages/checkout.css';
import '@/styles/pages/orders.css';
import { can } from '@/lib/security/roles';
import { kurusToTl } from '@/lib/money';

export const dynamic = 'force-dynamic';

/** 0532 *** ** 67 — enough to recognise, not enough to copy from a shared screen. */
const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? `${digits.slice(0, 4)} *** ** ${digits.slice(-2)}` : '***';
};

export default async function SiparisOnayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
  const isAdmin = can(session?.role, 'orders');
  const isOwner = Boolean(
    session?.userId && order.userId && session.userId === order.userId
  );
  // Guests: the 24-hour HttpOnly cookie set when the order was placed (no token in the URL).
  const isVerifiedGuest = await hasGuestOrderAccess(order.orderNumber);

  if (!isAdmin && !isOwner && !isVerifiedGuest) {
    return (
      <main id="main" className="padded-main">
        <div className="order-success-page" style={{ maxWidth: '540px', textAlign: 'center' }}>
          <div className="order-success-seal" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="order-success-kicker">PANDIONES</p>
          <h1 className="order-success-title">Erişim Yetkisi Gerekli</h1>
          <p className="order-success-desc">
            Bu siparişin detaylarını görüntülemek için siparişi veren hesapla giriş yapmanız veya sipariş onay bağlantısını kullanmanız gerekmektedir.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '28px', flexWrap: 'wrap' }}>
            <Link href="/giris-yap" className="btn btn--primary btn--lg">
              Giriş Yap ↗
            </Link>
            <Link href="/yeni-gelenler" className="btn btn--secondary btn--lg">
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
        <div className="order-success-page" style={{ maxWidth: '540px', textAlign: 'center' }}>
          <div className="order-success-seal" aria-hidden="true">
            {isFailed ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
          </div>
          <p className="order-success-kicker">PANDIONES</p>
          <h1 className="order-success-title">
            {isFailed ? 'Ödeme Onaylanamadı' : 'Ödeme Bekleniyor'}
          </h1>
          <p className="order-success-desc">
            {isFailed
              ? 'Siparişiniz için bankanızdan ödeme onayı alınamadı. Kart bilgilerinizi kontrol ederek lütfen tekrar deneyiniz.'
              : 'Siparişinizin ödeme doğrulaması henüz tamamlanmadı. İşleminizi tamamlamak için ödeme adımına ilerleyebilirsiniz.'}
          </p>
          <div style={{ marginTop: '28px' }}>
            <Link href="/odeme" className="btn btn--primary btn--lg btn--block">
              {isFailed ? 'Ödemeyi Tekrar Dene ↗' : 'Ödeme Adımına Git ↗'}
            </Link>
          </div>
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
        <header className="order-success-hero">
          <div className="order-success-seal" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="order-success-kicker">PANDIONES / SİPARİŞ ONAYI</p>
          <h1 className="order-success-title">Siparişiniz Alındı</h1>
          <p className="order-success-desc">
            Teşekkür ederiz{order.customerName ? `, ${order.customerName}` : ''}. Sipariş detaylarınız aşağıda yer almaktadır; onay ve takip bilgileri kayıtlı e-posta adresinize iletildi.
          </p>
        </header>

        <article className="order-receipt-card" aria-label="Sipariş Makbuzu">
          {/* Top: Sipariş No & Durum */}
          <div className="order-receipt-top">
            <div className="order-receipt-id-group">
              <span className="order-receipt-num">{order.orderNumber}</span>
              <span className="order-receipt-date">
                {new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="order-receipt-badge" role="status">
              <span className="status-dot status-dot--active" aria-hidden="true" />
              <span>
                {order.status === 'KARGODA'
                  ? 'Kargoya Verildi'
                  : order.status === 'TESLIM_EDILDI'
                  ? 'Teslim Edildi'
                  : order.status === 'HAZIRLANIYOR'
                  ? 'Hazırlanıyor'
                  : 'Ödeme Onaylandı'}
              </span>
            </div>
          </div>

          {/* Kargo Takip (Varsa) */}
          {order.trackingCode && (
            <section className="order-receipt-section">
              <h2 className="order-receipt-section-title">Kargo Bilgileri</h2>
              <div className="order-receipt-info-block">
                <p>
                  <strong>{order.trackingCompany || 'Kargo Firması'}:</strong>{' '}
                  <code style={{ fontFamily: 'var(--font-mono)' }}>{order.trackingCode}</code>
                </p>
              </div>
            </section>
          )}

          {/* Ödeme Detayı (Varsa son 4 hane) */}
          {latestTransaction?.lastFourDigits && (
            <section className="order-receipt-section">
              <h2 className="order-receipt-section-title">Ödeme Yöntemi</h2>
              <div className="order-receipt-info-block">
                <p>
                  {latestTransaction.cardFamily || latestTransaction.cardAssociation || 'Kredi Kartı'}{' '}
                  ···· {latestTransaction.lastFourDigits}
                  {latestTransaction.installment > 1 ? ` (${latestTransaction.installment} Taksit)` : ' (Tek Çekim)'}
                </p>
              </div>
            </section>
          )}

          {/* Teslimat Adresi */}
          <section className="order-receipt-section">
            <h2 className="order-receipt-section-title">Teslimat Adresi</h2>
            <div className="order-receipt-info-block">
              <p className="recipient-name">
                {order.customerName} {order.customerPhone ? `· ${maskPhone(order.customerPhone)}` : ''}
              </p>
              <p className="recipient-address">
                {order.shippingAddress}, {order.shippingDistrict} / {order.shippingCity}
              </p>
            </div>
          </section>

          {/* Satın Alınan Parçalar */}
          {order.items && order.items.length > 0 && (
            <section className="order-receipt-section">
              <h2 className="order-receipt-section-title">Sipariş Edilen Parçalar</h2>
              <ul className="order-receipt-items-list" role="list">
                {order.items.map((item) => (
                  <li key={item.id} className="order-receipt-item" role="listitem">
                    <div className="order-receipt-item-info">
                      <span className="order-receipt-item-name">{item.productName}</span>
                      <span className="order-receipt-item-meta">
                        Beden {item.size} · {item.quantity} adet
                      </span>
                    </div>
                    <span className="order-receipt-item-price">{money(kurusToTl(item.priceKurus * item.quantity))}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Tutar Dökümü */}
          <div className="order-receipt-totals">
            <div className="order-receipt-total-row">
              <span>Teslimat</span>
              <span>Ücretsiz</span>
            </div>
            {order.discountKurus > 0 && (
              <div className="order-receipt-total-row">
                <span>İndirim</span>
                <span>-{money(kurusToTl(order.discountKurus))}</span>
              </div>
            )}
            <div className="order-receipt-total-row order-receipt-total-row--final">
              <span>Toplam Tutar</span>
              <span>{order.totalKurus ? money(kurusToTl(order.totalKurus)) : '—'}</span>
            </div>
          </div>

          {/* Aksiyonlar (Yazdır & Takip Linki) */}
          <div className="order-receipt-actions print-hide">
            <OrderPrintButton />
            <div className="order-receipt-links">
              <Link href="/siparis-takip">Sipariş Takibi</Link>
              {session?.userId && <Link href="/siparislerim">Tüm Siparişlerim</Link>}
            </div>
          </div>
        </article>

        <Link
          href="/yeni-gelenler"
          className="btn btn--primary btn--lg btn--block print-hide"
        >
          Koleksiyonu Keşfet ↗
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
          .order-receipt-card {
            border: 1px solid var(--line) !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}
