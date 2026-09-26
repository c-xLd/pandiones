'use client';

import React, { useState } from 'react';
import Notice from '@/components/ui/Notice';

export type AppliedCoupon = {
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  isGiftCard?: boolean;
  remainingGiftCardBalance?: number;
};

type Props = {
  applied: AppliedCoupon | null;
  error: string | null;
  loading: boolean;
  onApply: (code: string) => Promise<boolean>;
  onRemove: () => void;
  formatMoney: (n: number) => string;
};

export default function CouponForm({ applied, error, loading, onApply, onRemove, formatMoney }: Props) {
  const [code, setCode] = useState('');

  if (applied) {
    return (
      <Notice tone="success" className="coupon-applied">
        <p>
          <strong>{applied.code}</strong> {applied.isGiftCard ? 'hediye kartı' : 'kuponu'} uygulandı
          {' '}(−{formatMoney(applied.discountAmount)})
        </p>
        {applied.isGiftCard && typeof applied.remainingGiftCardBalance === 'number' ? (
          <p className="coupon-applied__balance">Kartta kalan bakiye: {formatMoney(applied.remainingGiftCardBalance)}</p>
        ) : null}
        <button type="button" className="btn btn--link coupon-applied__remove" onClick={onRemove}>Kaldır</button>
      </Notice>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || loading) return;
    if (await onApply(trimmed)) setCode('');
  };

  return (
    <form className="coupon-form" onSubmit={submit} noValidate>
      <label className="field__label" htmlFor="couponCode">Kupon veya hediye kartı</label>
      <div className="coupon-form__row">
        <input
          id="couponCode"
          className="field__control coupon-form__input"
          name="couponCode"
          autoComplete="off"
          spellCheck={false}
          placeholder="Örn: PANDIONES10"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'couponCode-error' : undefined}
        />
        <button type="submit" className="btn btn--secondary coupon-form__submit" disabled={loading || !code.trim()} aria-busy={loading || undefined}>
          Uygula
        </button>
      </div>
      {error ? <p id="couponCode-error" className="field__error" aria-live="polite">{error}</p> : null}
    </form>
  );
}
