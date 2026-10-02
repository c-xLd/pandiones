'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import FormField from '@/components/ui/FormField';
import Notice from '@/components/ui/Notice';
import StatusPanel from '@/components/ui/StatusPanel';
import { formatTRY } from '@/lib/format/money';
import type { CartLineQuote } from '@/lib/cart/quote';
import { isGiftCardItem, useCartQuote } from '@/lib/cart/useCartQuote';
import type { CartItem, Product } from '@/types';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/cart.css';

type AppliedCoupon = { code: string; discountAmount: number; isGiftCard?: boolean };

const itemHref = (item: CartItem) => {
  if (isGiftCardItem(item)) return '/hediye-karti';
  return `/urun/${item.slug}`;
};

const lineNote = (quote: CartLineQuote | undefined, quantity: number, previousPrice?: number) => {
  if (!quote) return null;
  switch (quote.status) {
    case 'sold-out':
      return { tone: 'danger', text: 'Bu beden tükendi. Ödemeye geçmek için çantadan kaldırın.' } as const;
    case 'unavailable':
      return { tone: 'danger', text: 'Bu parça artık satışta değil. Ödemeye geçmek için çantadan kaldırın.' } as const;
    case 'insufficient-stock':
      return { tone: 'danger', text: `Bu bedende ${quote.stock} adet var; adedi ${quantity - quote.stock} azaltın.` } as const;
    case 'price-changed':
      return { tone: 'warning', text: `Fiyat güncellendi: ${formatTRY(quote.price ?? 0)}.` } as const;
    default:
      if (previousPrice !== undefined && previousPrice !== quote.price) {
        return { tone: 'warning', text: `Fiyat ${formatTRY(previousPrice)} iken ${formatTRY(quote.price ?? 0)} olarak güncellendi.` } as const;
      }
      return quote.stock > 0 && quote.stock <= 3
        ? ({ tone: 'muted', text: `Bu bedende son ${quote.stock} adet.` } as const)
        : null;
  }
};

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, isLoaded, showToast } = useCart();
  const { isFavorite, toggleWishlist } = useWishlist();

  const { status: quoteStatus, isQuoting, quoteFor, unitPrice, previousPrice, subtotal, blockingCount, retry } = useCartQuote();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [movingKey, setMovingKey] = useState<string | null>(null);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const discount = Math.min(appliedCoupon?.discountAmount ?? 0, subtotal);
  const total = Math.max(0, subtotal - discount);
  const checkoutBlocked = blockingCount > 0;

  // A coupon was validated against the old subtotal; drop it when the cart changes.
  const subtotalRef = useRef(subtotal);
  useEffect(() => {
    if (appliedCoupon && subtotalRef.current !== subtotal) {
      setAppliedCoupon(null);
      setCouponError('Çanta değişti; kodu yeniden uygulayın.');
    }
    subtotalRef.current = subtotal;
  }, [subtotal, appliedCoupon]);

  const handleMoveToWishlist = async (item: CartItem) => {
    const key = `${item.slug}-${item.size}`;
    setMovingKey(key);
    const product: Product = {
      id: item.id,
      slug: item.slug,
      name: item.name,
      price: unitPrice(item),
      color: item.color,
      category: item.category || 'ic-giyim',
      image: item.image,
      description: '',
    };
    try {
      if (!isFavorite(product.id)) await toggleWishlist(product);
      removeFromCart(item.slug, item.size);
      showToast(`${item.name} favorilere taşındı.`);
    } catch {
      showToast('Favorilere taşınamadı. Parça çantanızda duruyor.');
    } finally {
      setMovingKey(null);
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim();
    if (isApplyingCoupon) return;
    if (!code) {
      setCouponError('Bir kod girin.');
      return;
    }
    setIsApplyingCoupon(true);
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cart }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.valid) {
        setAppliedCoupon({ code: data.code, discountAmount: data.discountAmount, isGiftCard: data.isGiftCard });
        setCouponCode('');
        showToast(`${data.code} uygulandı.`);
      } else {
        setCouponError(data.error || 'Kod geçersiz.');
      }
    } catch {
      setCouponError('Kod doğrulanamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const checkoutHref = appliedCoupon ? `/odeme?coupon=${encodeURIComponent(appliedCoupon.code)}` : '/odeme';

  if (isLoaded && cart.length === 0) {
    return (
      <main id="main" className="cart-page cart-page--empty">
        <StatusPanel
          eyebrow="Çanta"
          title="Çantanız boş"
          actions={
            <Link href="/yeni-gelenler" className="btn btn--primary btn--lg">
              Koleksiyona git
            </Link>
          }
        >
          <p>Seçtiğiniz parçalar burada, beden ve adetleriyle birlikte bekler.</p>
        </StatusPanel>
        <nav className="cart-empty-links" aria-label="Kategoriler">
          <Link href="/ic-giyim">İç giyim</Link>
          <Link href="/ev-giyim">Ev giyim</Link>
          <Link href="/favorilerim">Favorilerim</Link>
        </nav>
      </main>
    );
  }

  const checkoutLabel = checkoutBlocked ? 'Önce çantayı düzenleyin' : 'Ödemeye geç';

  return (
    <main id="main" className="cart-page">
      <div className="cart-layout">
        <section className="cart-lines" aria-labelledby="cart-title">
          <header className="cart-head">
            <p className="cart-eyebrow">Alışveriş çantası</p>
            <h1 id="cart-title" className="cart-title">
              Çantanız
              {isLoaded ? <span className="cart-title-count">{totalItems} parça</span> : null}
            </h1>
          </header>

          {quoteStatus === 'error' ? (
            <Notice tone="warning" role="status" className="cart-quote-notice">
              <p>Güncel fiyat ve stok bilgisi alınamadı. Ödeme adımında tüm tutarlar yeniden doğrulanır.</p>
              <button type="button" className="btn btn--link" onClick={retry}>
                Tekrar dene
              </button>
            </Notice>
          ) : null}

          {!isLoaded ? (
            <ul className="cart-list" aria-busy="true" aria-label="Çanta yükleniyor">
              {[0, 1].map((i) => (
                <li key={i} className="cart-line cart-line--skeleton" aria-hidden="true">
                  <span className="cart-line-media skeleton-block" />
                  <span className="cart-line-skeleton-text">
                    <span className="skeleton-block" />
                    <span className="skeleton-block" />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="cart-list">
              {cart.map((item, index) => {
                const key = `${item.slug}-${item.size}`;
                const q = quoteFor(item);
                const note = lineNote(q, item.quantity, previousPrice(item));
                const atStockLimit = q ? item.quantity >= q.stock : false;
                const giftCard = isGiftCardItem(item);
                const price = unitPrice(item);

                return (
                  <li key={key} className="cart-line" style={{ '--i': index } as React.CSSProperties}>
                    <Link href={itemHref(item)} className="cart-line-media" tabIndex={-1} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt="" loading="lazy" decoding="async" />
                    </Link>

                    <div className="cart-line-body">
                      <div className="cart-line-top">
                        <div className="cart-line-info">
                          <h2 className="cart-line-name">
                            <Link href={itemHref(item)}>{item.name}</Link>
                          </h2>
                          <p className="cart-line-meta">
                            {giftCard ? (
                              <>Dijital hediye kartı{item.recipientName ? ` · ${item.recipientName}` : ''}</>
                            ) : (
                              <>
                                {item.color} <span aria-hidden="true">·</span> Beden {item.size}
                              </>
                            )}
                          </p>
                          <p className="cart-line-unit">{formatTRY(price)} / adet</p>
                        </div>
                        <p className="cart-line-price" aria-label={`Satır tutarı ${formatTRY(price * item.quantity)}`}>
                          {formatTRY(price * item.quantity)}
                        </p>
                      </div>

                      {note ? (
                        <p className={`cart-line-note cart-line-note--${note.tone}`} role={note.tone === 'danger' ? 'alert' : undefined}>
                          {note.text}
                        </p>
                      ) : null}

                      <div className="cart-line-actions">
                        <div className="qty-stepper" role="group" aria-label={`${item.name} adedi`}>
                          <button
                            type="button"
                            className="qty-stepper-btn"
                            aria-label={item.quantity === 1 ? `${item.name} çantadan kaldır` : 'Adedi bir azalt'}
                            onClick={() => updateQuantity(item.slug, item.size, -1)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>
                          </button>
                          <output className="qty-stepper-val" aria-live="polite">
                            {item.quantity}
                          </output>
                          <button
                            type="button"
                            className="qty-stepper-btn"
                            aria-label="Adedi bir artır"
                            disabled={atStockLimit}
                            title={atStockLimit ? 'Stoktaki adet sınırına ulaşıldı' : undefined}
                            onClick={() => updateQuantity(item.slug, item.size, 1)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12" /></svg>
                          </button>
                        </div>

                        <div className="cart-line-links">
                          {!giftCard && item.id ? (
                            <button
                              type="button"
                              className="cart-text-btn"
                              aria-busy={movingKey === key || undefined}
                              disabled={movingKey === key}
                              onClick={() => handleMoveToWishlist(item)}
                            >
                              Favorilere taşı
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="cart-text-btn"
                            onClick={() => removeFromCart(item.slug, item.size)}
                            aria-label={`${item.name} çantadan kaldır`}
                          >
                            Kaldır
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <Link href="/yeni-gelenler" className="cart-back-link">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            Alışverişe devam et
          </Link>
        </section>

        <aside className="cart-summary" aria-labelledby="cart-summary-title">
          <div className="cart-summary-inner">
            <h2 id="cart-summary-title" className="cart-summary-title">Sipariş özeti</h2>

            <dl className="cart-summary-rows">
              <div className="cart-summary-row">
                <dt>Ara toplam</dt>
                <dd>{isLoaded ? formatTRY(subtotal) : '—'}</dd>
              </div>
              {appliedCoupon ? (
                <div className="cart-summary-row cart-summary-row--discount">
                  <dt>{appliedCoupon.isGiftCard ? 'Hediye kartı' : 'İndirim'} ({appliedCoupon.code})</dt>
                  <dd>−{formatTRY(discount)}</dd>
                </div>
              ) : null}
              <div className="cart-summary-row">
                <dt>Teslimat</dt>
                <dd>Ücretsiz</dd>
              </div>
            </dl>

            <div className="cart-coupon">
              {appliedCoupon ? (
                <div className="cart-coupon-applied">
                  <p>
                    <span className="chip">{appliedCoupon.code}</span> uygulandı
                  </p>
                  <button type="button" className="cart-text-btn" onClick={handleRemoveCoupon}>
                    Kaldır
                  </button>
                </div>
              ) : (
                <form className="cart-coupon-form" onSubmit={handleApplyCoupon} noValidate>
                  <FormField id="cart-coupon" label="İndirim veya hediye kartı kodu" error={couponError || undefined}>
                    <input
                      type="text"
                      value={couponCode}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        if (couponError) setCouponError('');
                      }}
                    />
                  </FormField>
                  <button
                    type="submit"
                    className="btn btn--secondary"
                    aria-busy={isApplyingCoupon || undefined}
                    disabled={isApplyingCoupon || !isLoaded || isQuoting}
                  >
                    Uygula
                  </button>
                </form>
              )}
            </div>

            <div className="cart-summary-total">
              <span>Toplam</span>
              <span className="cart-summary-total-val">{isLoaded ? formatTRY(total) : '—'}</span>
            </div>
            <p className="cart-summary-fineprint">
              KDV dahildir. Fiyat, stok ve indirimler ödeme adımında sunucuda yeniden doğrulanır.
            </p>

            {checkoutBlocked ? (
              <p id="cart-blocked-reason" className="cart-line-note cart-line-note--danger">
                {blockingCount === 1 ? 'Bir parça' : `${blockingCount} parça`} şu an satın alınamıyor. Çantayı düzenleyin.
              </p>
            ) : null}

            <CheckoutButton
              href={checkoutHref}
              label={checkoutLabel}
              total={isLoaded ? formatTRY(total) : ''}
              disabled={!isLoaded || checkoutBlocked}
              reasonId={checkoutBlocked ? 'cart-blocked-reason' : undefined}
              className="cart-summary-cta"
            />
          </div>
        </aside>
      </div>

      {isLoaded ? (
        <div className="cart-mobile-bar">
          <div className="cart-mobile-bar-total">
            <span>Toplam</span>
            <strong>{formatTRY(total)}</strong>
          </div>
          <CheckoutButton href={checkoutHref} label={checkoutLabel}
            disabled={checkoutBlocked}
            reasonId={checkoutBlocked ? 'cart-blocked-reason' : undefined}
          />
        </div>
      ) : null}
    </main>
  );
}

function CheckoutButton({
  href,
  label,
  total,
  disabled,
  reasonId,
  className,
}: {
  href: string;
  label: string;
  total?: string;
  disabled?: boolean;
  reasonId?: string;
  className?: string;
}) {
  const classes = ['btn btn--primary btn--lg btn--block', total ? 'btn--split' : '', className].filter(Boolean).join(' ');
  const content = (
    <>
      <span>{label}</span>
      {total ? <span className="cart-cta-total">{total}</span> : null}
    </>
  );
  if (disabled) {
    return (
      <span className={classes} role="link" aria-disabled="true" aria-describedby={reasonId}>
        {content}
      </span>
    );
  }
  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
