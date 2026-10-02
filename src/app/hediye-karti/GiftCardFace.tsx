import React from 'react';
import { formatTRY } from '@/lib/format/money';
import type { GiftCardThemeId } from '@/lib/gift-cards/purchase';

type GiftCardFaceProps = {
  theme: GiftCardThemeId;
  amount: number;
  recipientName?: string;
  senderName?: string;
  /** Changes replay the foil sweep (theme or amount switched). */
  shineKey?: string;
  /** The brand monogram file exists in public/; otherwise a serif P stands in. */
  hasMonogram?: boolean;
};

/** Front of the card: monogram watermark, foil frame, amount, names. Purely visual. */
export default function GiftCardFace({ theme, amount, recipientName, senderName, shineKey, hasMonogram }: GiftCardFaceProps) {
  return (
    <div className={`giftcard__face giftcard__front giftcard--${theme}`}>
      <GiftCardMonogram hasMonogram={hasMonogram} />
      <div className="giftcard__top">
        <span className="giftcard__logo">PANDIONES</span>
        <span className="giftcard__kind">Hediye kartı</span>
      </div>
      <p className="giftcard__amount" key={`amount-${amount}`}>{amount > 0 ? formatTRY(amount) : '—'}</p>
      <div className="giftcard__bottom">
        <span>
          <span className="giftcard__label">Alıcı</span>
          {recipientName?.trim() || 'Alıcının adı'}
        </span>
        <span>
          <span className="giftcard__label">Gönderen</span>
          {senderName?.trim() || '—'}
        </span>
      </div>
      <span className="giftcard__glare" aria-hidden="true" />
      <span className="giftcard__shine" key={shineKey} aria-hidden="true" />
    </div>
  );
}

export const MONOGRAM_PUBLIC_PATH = '/assets/brand/pandiones-monogram.png';

/** Brand P monogram, recoloured per design through a CSS mask; serif letter until the file is added. */
export function GiftCardMonogram({ hasMonogram }: { hasMonogram?: boolean }) {
  return hasMonogram ? (
    <span className="giftcard__monogram giftcard__monogram--logo" aria-hidden="true" />
  ) : (
    <span className="giftcard__monogram" aria-hidden="true">P</span>
  );
}
