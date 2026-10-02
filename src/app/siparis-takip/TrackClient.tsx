'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import FormField from '@/components/ui/FormField';
import Turnstile, { turnstileEnabled } from '@/components/security/Turnstile';
import Notice from '@/components/ui/Notice';
import { formatTRY } from '@/lib/format/money';
import { useCopy } from '@/lib/hooks/useCopy';
import {
  carrierTrackingUrl,
  formatDate,
  orderProgressStep,
  orderStatusLead,
  orderStatusMeta,
  productHref,
  ORDER_STEPS,
} from '@/lib/orders';

type TrackedItem = {
  id: string;
  productName: string;
  productSlug: string;
  productImage: string;
  size: string;
  quantity: number;
  price: number;
};

type TrackedOrder = {
  orderNumber: string;
  createdAt: string;
  paidAt?: string | null;
  status: string;
  totalAmount: number;
  shippingCity: string;
  shippingDistrict: string;
  trackingCompany?: string | null;
  trackingCode?: string | null;
  items: TrackedItem[];
};

type Errors = { orderNumber?: string; email?: string };
type Failure = { message: string; retryable: boolean } | null;

const ORDER_PATTERN = /^PAN-[0-9]{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(orderNumber: string, email: string): Errors {
  const errors: Errors = {};
  if (!orderNumber) errors.orderNumber = 'Sipariş numaranızı yazın.';
  else if (!ORDER_PATTERN.test(orderNumber)) errors.orderNumber = 'Sipariş numarası PAN-123456 biçimindedir.';
  if (!email) errors.email = 'E-posta adresinizi yazın.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Geçerli bir e-posta adresi yazın.';
  return errors;
}

export default function TrackClient() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<Failure>(null);
  const [loading, setLoading] = useState(false);
  const [humanToken, setHumanToken] = useState<string | null>(null);
  const [humanReset, setHumanReset] = useState(0);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const orderInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const { copy, label } = useCopy();

  useEffect(() => {
    if (order) resultHeadingRef.current?.focus();
  }, [order]);

  const lookup = async () => {
    const cleanOrder = orderNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const nextErrors = validate(cleanOrder, cleanEmail);
    setErrors(nextErrors);
    if (nextErrors.orderNumber) return orderInputRef.current?.focus();
    if (nextErrors.email) return emailInputRef.current?.focus();
    if (loading) return;

    setLoading(true);
    setFailure(null);
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: cleanOrder, email: cleanEmail, turnstileToken: humanToken }),
      });
      setHumanReset((v) => v + 1);
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setFailure({ message: 'Bu sipariş numarası ve e-posta ile eşleşen bir sipariş bulamadık. İkisini de sipariş onay e-postanızla karşılaştırın.', retryable: false });
        return;
      }
      if (!res.ok || !data.success) {
        setFailure({ message: data.error || 'Sipariş sorgulanamadı.', retryable: true });
        return;
      }
      setOrder(data.order);
    } catch {
      setFailure({ message: 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.', retryable: true });
    } finally {
      setLoading(false);
    }
  };

  const [returnFocus, setReturnFocus] = useState(false);

  useEffect(() => {
    if (!order && returnFocus) {
      orderInputRef.current?.focus();
      setReturnFocus(false);
    }
  }, [order, returnFocus]);

  const startOver = () => {
    setOrder(null);
    setFailure(null);
    setReturnFocus(true);
  };

  if (order) return <TrackedOrderView order={order} headingRef={resultHeadingRef} onStartOver={startOver} copy={copy} copyLabel={label} />;

  return (
    <section className="track-form-wrap" aria-labelledby="track-form-title">
      <h2 id="track-form-title" className="visually-hidden">Sipariş sorgulama</h2>
      <form
        className="track-form"
        noValidate
        aria-busy={loading}
        onSubmit={(event) => {
          event.preventDefault();
          void lookup();
        }}
      >
        <FormField id="track-order" label="Sipariş numarası" required hint="Sipariş onay e-postanızda yazar, örn. PAN-123456." error={errors.orderNumber}>
          <input
            ref={orderInputRef}
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="track-form__code"
            placeholder="PAN-000000"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
          />
        </FormField>
        <FormField id="track-email" label="E-posta" required hint="Siparişi verirken kullandığınız adres." error={errors.email}>
          <input
            ref={emailInputRef}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="ornek@eposta.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <Turnstile action="track" onToken={setHumanToken} resetKey={humanReset} />
        <button type="submit" className="btn btn--primary btn--lg track-form__submit" disabled={loading || (turnstileEnabled && !humanToken)} aria-busy={loading}>
          {loading ? 'Sorgulanıyor…' : 'Siparişi bul'}
        </button>
      </form>

      {failure ? (
        <Notice tone="danger" role="alert" className="track-form__alert">
          <p>{failure.message}</p>
          {failure.retryable ? (
            <button type="button" className="btn btn--link" onClick={() => void lookup()} disabled={loading}>
              Tekrar dene
            </button>
          ) : (
            <p>
              Bulamıyorsanız <Link href="/iletisim">bize yazın</Link>; sipariş numaranızı birlikte bulalım.
            </p>
          )}
        </Notice>
      ) : null}
    </section>
  );
}

type ViewProps = {
  order: TrackedOrder;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onStartOver: () => void;
  copy: (text: string, id: string) => Promise<void>;
  copyLabel: (id: string, idle?: string) => string;
};

function TrackedOrderView({ order, headingRef, onStartOver, copy, copyLabel }: ViewProps) {
  const status = orderStatusMeta(order.status);
  const step = orderProgressStep(order.status);
  const trackingUrl = carrierTrackingUrl(order.trackingCompany, order.trackingCode);
  const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <article className="order-detail track-result" aria-labelledby="track-result-title">
      <header className="order-detail__head">
        <div className="order-detail__id">
          <p className="orders-label">Sipariş {order.orderNumber}</p>
          <button type="button" className="orders-text-btn" onClick={onStartOver}>
            Başka bir sipariş sorgula
          </button>
        </div>
        <h2 id="track-result-title" ref={headingRef} tabIndex={-1} className={`order-detail__status order-detail__status--${status.tone}`}>
          {status.label}
        </h2>
        <p className="order-detail__lead">
          {orderStatusLead(order.status)}{' '}
          <span className="order-detail__when">{formatDate(order.createdAt)} · {pieces} parça</span>
        </p>
      </header>

      {step > 0 ? (
        <ol className="journey" style={{ '--progress': (step - 1) / (ORDER_STEPS.length - 1) } as React.CSSProperties}>
          {ORDER_STEPS.map((stepLabel, index) => {
            const state = index + 1 < step ? 'done' : index + 1 === step ? 'current' : 'todo';
            return (
              <li key={stepLabel} className={`journey__step journey__step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                <span className="journey__dot" aria-hidden="true" />
                <span className="journey__label">{stepLabel}</span>
                {index === 0 && order.paidAt ? <span className="journey__date">{formatDate(order.paidAt)}</span> : null}
                <span className="visually-hidden">{state === 'done' ? ' (tamamlandı)' : state === 'current' ? ' (şu an)' : ''}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {order.trackingCode ? (
        <section className="tracking-card" aria-labelledby="track-carrier">
          <div>
            <p className="tracking-card__carrier" id="track-carrier">{order.trackingCompany || 'Kargo'}</p>
            <p className="tracking-card__code">{order.trackingCode}</p>
          </div>
          <div className="tracking-card__actions">
            <button type="button" className="btn btn--on-dark btn--sm" onClick={() => void copy(order.trackingCode!, 'tracking')}>
              {copyLabel('tracking', 'Kodu kopyala')}
            </button>
            {trackingUrl ? (
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="btn btn--sm tracking-card__cta">
                Kargoyu takip et<span className="visually-hidden"> (yeni sekmede açılır)</span>
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="track-items-title" className="order-detail__section">
        <h3 id="track-items-title" className="orders-section-title">Parçalar</h3>
        <ul className="order-pieces">
          {order.items.map((item) => {
            const href = productHref(item.productSlug);
            const media = item.productImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.productImage} alt="" width={240} height={360} loading="lazy" />
            ) : null;
            return (
              <li key={item.id} className="order-piece">
                {href ? (
                  <Link href={href} className="order-piece__media" tabIndex={-1} aria-hidden="true">{media}</Link>
                ) : (
                  <span className="order-piece__media">{media}</span>
                )}
                <p className="order-product-name">{href ? <Link href={href}>{item.productName}</Link> : item.productName}</p>
                <p className="order-piece__meta">Beden {item.size} · {item.quantity} adet</p>
                <p className="order-piece__price">{formatTRY(item.price * item.quantity)}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="order-detail__split">
        <section aria-labelledby="track-address-title" className="order-detail__section">
          <h3 id="track-address-title" className="orders-section-title">Teslimat</h3>
          <p className="order-address-block">
            <span>{order.shippingDistrict} / {order.shippingCity}</span>
            <span className="track-result__muted">Tam adres, hesabınızdaki sipariş ayrıntısında görünür.</span>
          </p>
        </section>
        <section aria-labelledby="track-total-title" className="order-detail__section">
          <h3 id="track-total-title" className="orders-section-title">Ödeme</h3>
          <dl className="order-totals">
            <div>
              <dt>Teslimat</dt>
              <dd>Ücretsiz</dd>
            </div>
            <div className="order-totals__grand">
              <dt>Toplam</dt>
              <dd className="orders-num">{formatTRY(order.totalAmount)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className="track-result__foot">
        <p>Adres değişikliği ya da siparişle ilgili bir sorunuz mu var?</p>
        <Link href="/iletisim" className="btn btn--secondary">Bize yazın</Link>
      </footer>
    </article>
  );
}
