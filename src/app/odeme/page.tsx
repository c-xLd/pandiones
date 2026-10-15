'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { PHOTO_QUALITY } from '@/lib/images';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import FormField from '@/components/ui/FormField';
import Notice from '@/components/ui/Notice';
import StatusPanel from '@/components/ui/StatusPanel';
import { formatTRY } from '@/lib/format/money';
import { isBlockingStatus } from '@/lib/cart/quote';
import { useCartQuote } from '@/lib/cart/useCartQuote';
import {
  CHECKOUT_FIELD_ORDER,
  validateCheckoutForm,
  type CheckoutFieldErrors,
  type CheckoutFormData,
} from '@/lib/checkout/form-validation';
import CheckoutStepper from './_components/CheckoutStepper';
import SavedAddressPicker, { type SavedAddress } from './_components/SavedAddressPicker';
import CouponForm, { type AppliedCoupon } from './_components/CouponForm';
import PaymentStep from './_components/PaymentStep';
import CheckoutSkeleton from './_components/CheckoutSkeleton';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/checkout.css';

const EMPTY_FORM: CheckoutFormData = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  shippingCity: '',
  shippingDistrict: '',
  shippingAddress: '',
  shippingNotes: '',
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, isLoaded } = useCart();
  const { user } = useAuth();
  const quote = useCartQuote();

  const [formData, setFormData] = useState<CheckoutFormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [dbAddresses, setDbAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const urlError = searchParams.get('error');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? decodeURIComponent(urlError) : null);

  const [paymentHtml, setPaymentHtml] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const submitRef = useRef<HTMLButtonElement | null>(null);
  // Same key for a retried request (e.g. the network dropped mid-submit) so the server never makes two orders;
  // a new key after every answer the server actually gave.
  const idempotencyKeyRef = useRef<string | null>(null);

  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const subtotal = quote.subtotal;
  const discount = Math.min(appliedCoupon?.discountAmount ?? 0, subtotal);
  const finalTotal = Math.max(0, subtotal - discount);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      customerName: prev.customerName || user.name,
      customerEmail: prev.customerEmail || user.email,
      customerPhone: prev.customerPhone || user.phone || '',
    }));

    fetch('/api/auth/addresses')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { addresses?: SavedAddress[] } | null) => {
        const addresses = data?.addresses ?? [];
        if (addresses.length === 0) return;
        setDbAddresses(addresses);
        const def = addresses.find((a) => a.isDefault) || addresses[0];
        setSelectedAddressId(def.id);
        setFormData((prev) => ({
          ...prev,
          customerName: def.recipient || prev.customerName || user.name,
          customerPhone: def.phone || prev.customerPhone || user.phone || '',
          shippingAddress: def.address,
          shippingDistrict: def.district,
          shippingCity: def.city,
        }));
      })
      // Saved addresses are a shortcut; the form stays usable without them.
      .catch(() => {});
  }, [user]);

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setFieldErrors({});
    setFormData((prev) => ({
      ...prev,
      customerName: addr.recipient || prev.customerName,
      customerPhone: addr.phone || prev.customerPhone,
      shippingAddress: addr.address,
      shippingDistrict: addr.district,
      shippingCity: addr.city,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = e.target.name as keyof CheckoutFormData;
    setFormData((prev) => ({ ...prev, [name]: e.target.value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleApplyCoupon = async (code: string): Promise<boolean> => {
    setCouponError(null);
    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cart }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCouponError(data.error || 'Kod geçersiz.');
        setAppliedCoupon(null);
        return false;
      }
      setAppliedCoupon(data);
      return true;
    } catch {
      setCouponError('Kod doğrulanamadı. Bağlantınızı kontrol edip tekrar deneyin.');
      return false;
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // A code applied on /canta arrives as ?coupon=; validate it here once prices are quoted.
  const cartCouponParam = searchParams.get('coupon');
  const cartCouponAppliedRef = useRef(false);
  useEffect(() => {
    if (!cartCouponParam || cartCouponAppliedRef.current || quote.status !== 'ready' || subtotal <= 0) return;
    cartCouponAppliedRef.current = true;
    handleApplyCoupon(cartCouponParam.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartCouponParam, quote.status, subtotal]);

  // A discount was calculated for one subtotal; drop it if the quoted subtotal changes.
  const couponSubtotalRef = useRef(subtotal);
  useEffect(() => {
    if (appliedCoupon && couponSubtotalRef.current !== subtotal) {
      setAppliedCoupon(null);
      setCouponError('Tutar değişti; kodu yeniden uygulayın.');
    }
    couponSubtotalRef.current = subtotal;
  }, [subtotal, appliedCoupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (cart.length === 0) {
      setError('Çantanızda ürün yok.');
      return;
    }
    if (quote.blockingCount > 0) {
      setError('Çantanızdaki bazı parçalar şu an satın alınamıyor. Çantayı düzenleyip tekrar deneyin.');
      return;
    }

    const errors = validateCheckoutForm(formData);
    const firstInvalid = CHECKOUT_FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      setFieldErrors(errors);
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setLoading(true);
    idempotencyKeyRef.current ??= crypto.randomUUID();
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKeyRef.current },
        body: JSON.stringify({ ...formData, couponCode: appliedCoupon?.code || null, cart }),
      });
      idempotencyKeyRef.current = null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fieldErrors && data.field) {
          setFieldErrors(data.fieldErrors);
          document.getElementById(data.field)?.focus();
        }
        throw new Error(data.error || 'Ödeme başlatılamadı. Tekrar deneyin.');
      }

      if (data.checkoutFormContent) {
        setIsTestMode(Boolean(data.isTestMode));
        setPaymentHtml(data.checkoutFormContent);
        setLoading(false);
        window.scrollTo({ top: 0 });
        return;
      }

      if (data.paymentPageUrl) {
        window.location.href = data.paymentPageUrl;
        return;
      }

      // Access to the confirmation page comes from the HttpOnly cookie the API just set.
      router.push(`/siparis-onay/${data.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Bağlantı kurulamadı. Tekrar deneyin.');
      setLoading(false);
    }
  };

  // Returning from the payment step puts focus back on the submit button once the form is rendered.
  const returningFromPaymentRef = useRef(false);
  const editDetails = () => {
    returningFromPaymentRef.current = true;
    setPaymentHtml(null);
  };
  useEffect(() => {
    if (paymentHtml || !returningFromPaymentRef.current) return;
    returningFromPaymentRef.current = false;
    submitRef.current?.focus();
  }, [paymentHtml]);

  if (!isLoaded) return <CheckoutSkeleton />;

  if (cart.length === 0 && !paymentHtml) {
    return (
      <main id="main" className="checkout-page checkout-page--empty">
        <StatusPanel
          eyebrow="Ödeme"
          title="Çantanız boş"
          actions={<Link href="/yeni-gelenler" className="btn btn--primary btn--lg">Yeni gelenlere git</Link>}
        >
          <p>Ödemeye geçmek için önce çantanıza bir parça ekleyin.</p>
        </StatusPanel>
      </main>
    );
  }

  const field = (name: keyof CheckoutFormData) => ({
    name,
    value: formData[name],
    onChange: handleChange,
  });

  const blocked = quote.blockingCount > 0;
  const submitLabel = loading ? 'Ödeme hazırlanıyor' : finalTotal === 0 ? 'Siparişi onayla' : 'Ödeme adımına geç';

  return (
    <main id="main" className="checkout-page">
      <header className="checkout-head">
        <div>
          <p className="checkout-eyebrow">{itemCount} parça · {formatTRY(finalTotal)}</p>
          <h1 className="checkout-title">Ödeme</h1>
        </div>
        <CheckoutStepper current={paymentHtml ? 2 : 1} />
      </header>

      <div className="checkout-container">
        <div className="checkout-main">
          {paymentHtml ? (
            <PaymentStep
              html={paymentHtml}
              isTestMode={isTestMode}
              recipient={formData.customerName}
              addressLine={`${formData.shippingDistrict} / ${formData.shippingCity}`}
              onEdit={editDetails}
            />
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {blocked ? (
                <Notice tone="danger" role="alert" className="checkout-block-notice">
                  <p>
                    {quote.blockingCount === 1 ? 'Bir parça' : `${quote.blockingCount} parça`} tükendi, satıştan kalktı veya stoktan fazla.
                  </p>
                  <Link href="/canta" className="btn btn--link">Çantayı düzenle</Link>
                </Notice>
              ) : null}

              <section className="checkout-section" aria-labelledby="checkout-contact-title">
                <h2 id="checkout-contact-title" className="checkout-section-title">
                  <span className="checkout-section-index" aria-hidden="true">01</span>
                  İletişim
                </h2>
                <FormField id="customerName" label="Ad soyad" required error={fieldErrors.customerName}>
                  <input {...field('customerName')} autoComplete="name" />
                </FormField>
                <div className="form-row">
                  <FormField id="customerEmail" label="E-posta" required error={fieldErrors.customerEmail} hint="Sipariş onayı bu adrese gönderilir.">
                    <input {...field('customerEmail')} type="email" inputMode="email" autoComplete="email" />
                  </FormField>
                  <FormField id="customerPhone" label="Cep telefonu" required error={fieldErrors.customerPhone}>
                    <input {...field('customerPhone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="05XX XXX XX XX" />
                  </FormField>
                </div>
              </section>

              <section className="checkout-section" aria-labelledby="checkout-address-title">
                <div className="checkout-section-head">
                  <h2 id="checkout-address-title" className="checkout-section-title">
                    <span className="checkout-section-index" aria-hidden="true">02</span>
                    Teslimat adresi
                  </h2>
                  {user ? <Link href="/hesabim#adresler" className="btn btn--link">Adreslerimi yönet</Link> : null}
                </div>

                {user && dbAddresses.length > 0 ? (
                  <SavedAddressPicker addresses={dbAddresses} selectedId={selectedAddressId} onSelect={handleSelectSavedAddress} />
                ) : null}

                <div className="form-row">
                  <FormField id="shippingCity" label="İl" required error={fieldErrors.shippingCity}>
                    <input {...field('shippingCity')} autoComplete="address-level1" />
                  </FormField>
                  <FormField id="shippingDistrict" label="İlçe" required error={fieldErrors.shippingDistrict}>
                    <input {...field('shippingDistrict')} autoComplete="address-level2" />
                  </FormField>
                </div>
                <FormField id="shippingAddress" label="Açık adres" required hint="Mahalle, cadde/sokak, bina ve daire numarası." error={fieldErrors.shippingAddress}>
                  <textarea {...field('shippingAddress')} rows={3} autoComplete="street-address" />
                </FormField>
                <FormField id="shippingNotes" label="Teslimat notu" optional>
                  <input {...field('shippingNotes')} autoComplete="off" />
                </FormField>
              </section>

              <section className="checkout-section checkout-section--last" aria-labelledby="checkout-payment-title">
                <h2 id="checkout-payment-title" className="checkout-section-title">
                  <span className="checkout-section-index" aria-hidden="true">03</span>
                  Ödeme
                </h2>
                <p className="checkout-payment-copy">
                  Kart bilgilerinizi bir sonraki adımda ödeme sağlayıcımız iyzico&apos;nun formuna girersiniz. Pandiones kart bilgisi görmez ve saklamaz.
                </p>
              </section>

              {error ? <p className="form-alert form-alert--error" role="alert">{error}</p> : null}

              <button
                ref={submitRef}
                className="btn btn--primary btn--lg btn--block btn--split submit-order-btn"
                type="submit"
                disabled={loading || blocked}
                aria-busy={loading || undefined}
              >
                <span>{submitLabel}</span>
                <span className="checkout-num">{formatTRY(finalTotal)}</span>
              </button>
              <Link href="/canta" className="checkout-back-link">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                Çantaya dön
              </Link>
            </form>
          )}
        </div>

        <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
          <div className="checkout-summary__head">
            <h2 id="checkout-summary-title" className="summary-title">Sipariş özeti</h2>
            <span className="checkout-summary__count">{itemCount} parça</span>
          </div>

          <ul className="checkout-items">
            {cart.map((item) => {
              const line = quote.quoteFor(item);
              const unavailable = line ? isBlockingStatus(line.status) : false;
              return (
                <li key={`${item.slug}-${item.size}`} className="checkout-item">
                  <span className="checkout-item__media">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={64}
                      height={96}
                      sizes="64px"
                      quality={PHOTO_QUALITY}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="checkout-item__qty" aria-label={`${item.quantity} adet`}>{item.quantity}</span>
                  </span>
                  <div className="checkout-item__info">
                    <p className="checkout-item-title">{item.name}</p>
                    <p className="checkout-item-meta">{item.color} · Beden {item.size}</p>
                    {unavailable ? <p className="checkout-item-alert">Satın alınamıyor</p> : null}
                  </div>
                  <span className="price">{formatTRY(quote.unitPrice(item) * item.quantity)}</span>
                </li>
              );
            })}
          </ul>

          {quote.status === 'error' ? (
            <Notice tone="warning" role="status" className="checkout-quote-notice">
              <p>Güncel fiyat ve stok alınamadı. Sipariş oluşturulurken tutar yeniden hesaplanır.</p>
              <button type="button" className="btn btn--link" onClick={quote.retry}>Tekrar dene</button>
            </Notice>
          ) : null}

          {paymentHtml ? null : (
            <div className="checkout-coupon">
              <CouponForm
                applied={appliedCoupon}
                error={couponError}
                loading={couponLoading || quote.isQuoting}
                onApply={handleApplyCoupon}
                onRemove={handleRemoveCoupon}
                formatMoney={formatTRY}
              />
            </div>
          )}

          <dl className="checkout-totals">
            <div className="summary-row"><dt>Ara toplam</dt><dd className="price">{formatTRY(subtotal)}</dd></div>
            {appliedCoupon ? (
              <div className="summary-row summary-row--discount">
                <dt>{appliedCoupon.isGiftCard ? 'Hediye kartı' : 'İndirim'} ({appliedCoupon.code})</dt>
                <dd className="price">−{formatTRY(discount)}</dd>
              </div>
            ) : null}
            <div className="summary-row"><dt>Teslimat</dt><dd>Ücretsiz</dd></div>
            <div className="summary-total"><dt>Toplam</dt><dd className="checkout-num">{formatTRY(finalTotal)}</dd></div>
          </dl>
          <p className="checkout-summary-note">KDV dahildir. Nihai tutar sipariş oluşturulurken sunucuda hesaplanır.</p>
        </aside>
      </div>
    </main>
  );
}

export default function OdemePage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutContent />
    </Suspense>
  );
}
