'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import FormField from '@/components/ui/FormField';
import Notice from '@/components/ui/Notice';
import { useCart } from '@/context/CartContext';
import { formatTRY } from '@/lib/format/money';
import {
  GIFT_CARD_LIMITS,
  GIFT_CARD_PRESETS,
  GIFT_CARD_THEMES,
  giftCardThemeName,
  validateGiftCardPurchase,
  type GiftCardPurchaseErrors,
  type GiftCardThemeId,
} from '@/lib/gift-cards/purchase';
import { GIFT_CARD_PRODUCT_ID, GIFT_CARD_PRODUCT_SLUG, type Product } from '@/types';
import GiftCardPreview from './GiftCardPreview';

const NOTE_SUGGESTIONS = [
  'Kendine güzel bir şey seçmen dileğiyle.',
  'İyi ki doğdun. Seçim senin.',
  'Küçük bir teşekkür, büyük bir sevgiyle.',
];

const FIELD_ORDER: Array<keyof GiftCardPurchaseErrors> = ['theme', 'amount', 'recipientName', 'recipientEmail', 'senderName', 'giftNote'];
const FIELD_IDS: Record<keyof GiftCardPurchaseErrors, string> = {
  theme: 'gift-theme-couture',
  amount: 'gift-amount-custom',
  recipientName: 'gift-recipient-name',
  recipientEmail: 'gift-recipient-email',
  senderName: 'gift-sender-name',
  giftNote: 'gift-note',
};

export default function GiftCardBuilder({ hasMonogram = false }: { hasMonogram?: boolean }) {
  const { addToCart, setIsBagOpen } = useCart();
  const [theme, setTheme] = useState<GiftCardThemeId>('couture');
  const [preset, setPreset] = useState<number | 'custom'>(2500);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [errors, setErrors] = useState<GiftCardPurchaseErrors>({});
  const [added, setAdded] = useState<{ amount: number; recipient: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const amount = preset === 'custom' ? Number(customAmount.replace(/\./g, '').replace(',', '.')) || 0 : preset;

  const clearError = (field: keyof GiftCardPurchaseErrors) => {
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    if (added) setAdded(null);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const input = { amount, theme, recipientName, recipientEmail, senderName, giftNote };
    const nextErrors = validateGiftCardPurchase(input);
    setErrors(nextErrors);
    const first = FIELD_ORDER.find((field) => nextErrors[field]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#${FIELD_IDS[first]}`)?.focus();
      return;
    }

    const product: Product = {
      id: GIFT_CARD_PRODUCT_ID,
      slug: GIFT_CARD_PRODUCT_SLUG,
      name: `Pandiones Dijital Hediye Kartı (${giftCardThemeName(theme)})`,
      price: amount,
      color: giftCardThemeName(theme),
      category: 'hediye-karti',
      subcategory: 'Dijital Hediye Kartı',
      image: '/assets/campaign-hero.jpeg',
      description: `Alıcı: ${recipientName.trim()} (${recipientEmail.trim()})`,
    };

    addToCart(product, `${amount} TL`, 1, {
      giftCardTheme: theme,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim().toLowerCase(),
      senderName: senderName.trim() || undefined,
      giftNote: giftNote.trim() || undefined,
      deliveryDate: 'now',
    });
    setAdded({ amount, recipient: recipientName.trim() });
    setIsBagOpen(true);
  };

  const startOver = () => {
    setAdded(null);
    setRecipientName('');
    setRecipientEmail('');
    setGiftNote('');
    formRef.current?.querySelector<HTMLElement>(`#${FIELD_IDS.recipientName}`)?.focus();
  };

  return (
    <div className="gift-builder">
      <div className="gift-builder__preview">
        <GiftCardPreview theme={theme} amount={amount} recipientName={recipientName} senderName={senderName} giftNote={giftNote} hasMonogram={hasMonogram} />
      </div>

      <form ref={formRef} className="gift-form" noValidate onSubmit={submit} aria-labelledby="gift-form-title">
        <h2 id="gift-form-title" className="visually-hidden">Hediye kartı hazırla</h2>

        <fieldset className="gift-form__group">
          <legend className="gift-form__legend"><span aria-hidden="true">01</span> Tasarım</legend>
          <div className="gift-themes">
            {GIFT_CARD_THEMES.map((item) => (
              <label key={item.id} className="gift-theme">
                <input
                  id={`gift-theme-${item.id}`}
                  type="radio"
                  name="gift-theme"
                  value={item.id}
                  checked={theme === item.id}
                  onChange={() => {
                    setTheme(item.id);
                    clearError('theme');
                  }}
                />
                <span className="gift-theme__body">
                  <span className={`gift-theme__swatch giftcard--${item.id}`} aria-hidden="true" />
                  <span className="gift-theme__name">{item.name}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.theme ? <p className="field__error">{errors.theme}</p> : null}
        </fieldset>

        <fieldset className="gift-form__group" aria-describedby={errors.amount ? 'gift-amount-error' : undefined}>
          <legend className="gift-form__legend"><span aria-hidden="true">02</span> Tutar</legend>
          <div className="segments gift-amounts">
            {GIFT_CARD_PRESETS.map((value) => (
              <label key={value} className="segment">
                <input
                  type="radio"
                  name="gift-amount"
                  checked={preset === value}
                  onChange={() => {
                    setPreset(value);
                    clearError('amount');
                  }}
                />
                <span>{formatTRY(value)}</span>
              </label>
            ))}
            <label className="segment">
              <input
                type="radio"
                name="gift-amount"
                checked={preset === 'custom'}
                onChange={() => {
                  setPreset('custom');
                  clearError('amount');
                }}
              />
              <span>Başka tutar</span>
            </label>
          </div>
          {preset === 'custom' ? (
            <FormField
              id="gift-amount-custom"
              label="Tutar (₺)"
              hint={`${GIFT_CARD_LIMITS.min.toLocaleString('tr-TR')} – ${GIFT_CARD_LIMITS.max.toLocaleString('tr-TR')} ₺, ${GIFT_CARD_LIMITS.step} ₺ ve katları.`}
              error={errors.amount}
              className="gift-form__custom"
            >
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="örn. 1500"
                value={customAmount}
                onChange={(event) => {
                  setCustomAmount(event.target.value);
                  clearError('amount');
                }}
              />
            </FormField>
          ) : errors.amount ? (
            <p id="gift-amount-error" className="field__error">{errors.amount}</p>
          ) : null}
        </fieldset>

        <fieldset className="gift-form__group">
          <legend className="gift-form__legend"><span aria-hidden="true">03</span> Alıcı ve not</legend>
          <div className="form-row">
            <FormField id="gift-recipient-name" label="Alıcının adı" required error={errors.recipientName}>
              <input
                type="text"
                autoComplete="off"
                maxLength={GIFT_CARD_LIMITS.name}
                value={recipientName}
                onChange={(event) => {
                  setRecipientName(event.target.value);
                  clearError('recipientName');
                }}
              />
            </FormField>
            <FormField id="gift-recipient-email" label="Alıcının e-postası" required hint="Kart bu adrese gönderilir." error={errors.recipientEmail}>
              <input
                type="email"
                inputMode="email"
                autoComplete="off"
                value={recipientEmail}
                onChange={(event) => {
                  setRecipientEmail(event.target.value);
                  clearError('recipientEmail');
                }}
              />
            </FormField>
          </div>
          <FormField id="gift-sender-name" label="Sizin adınız" optional hint="Boş bırakırsanız sipariş adınız kullanılır." error={errors.senderName}>
            <input
              type="text"
              autoComplete="name"
              maxLength={GIFT_CARD_LIMITS.name}
              value={senderName}
              onChange={(event) => {
                setSenderName(event.target.value);
                clearError('senderName');
              }}
            />
          </FormField>
          <FormField
            id="gift-note"
            label="Kişisel not"
            optional
            hint={`${giftNote.trim().length} / ${GIFT_CARD_LIMITS.note}`}
            error={errors.giftNote}
          >
            <textarea
              rows={3}
              maxLength={GIFT_CARD_LIMITS.note}
              value={giftNote}
              onChange={(event) => {
                setGiftNote(event.target.value);
                clearError('giftNote');
              }}
            />
          </FormField>
          <div className="gift-suggestions" role="group" aria-label="Not önerileri">
            {NOTE_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="gift-suggestion"
                onClick={() => {
                  setGiftNote(suggestion);
                  clearError('giftNote');
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="gift-form__foot">
          <p className="gift-form__info">
            Kart, ödemeniz onaylandığında kodu ve notunuzla birlikte alıcının e-posta adresine gönderilir.
          </p>
          <button type="submit" className="btn btn--primary btn--lg btn--block btn--split">
            <span>Çantaya ekle</span>
            <span className="orders-num">{amount > 0 ? formatTRY(amount) : '—'}</span>
          </button>
          {added ? (
            <Notice tone="success" role="status" className="gift-form__added">
              <p>
                {formatTRY(added.amount)} değerindeki kart ({added.recipient}) çantanızda.
              </p>
              <p className="gift-form__added-actions">
                <Link href="/canta">Çantaya git</Link>
                <button type="button" className="btn btn--link" onClick={startOver}>Başka bir kart hazırla</button>
              </p>
            </Notice>
          ) : null}
        </div>
      </form>
    </div>
  );
}
