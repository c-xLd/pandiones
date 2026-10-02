'use client';

import React, { useRef, useState } from 'react';
import type { GiftCardThemeId } from '@/lib/gift-cards/purchase';
import GiftCardFace, { GiftCardMonogram } from './GiftCardFace';

type GiftCardPreviewProps = {
  theme: GiftCardThemeId;
  amount: number;
  recipientName: string;
  senderName: string;
  giftNote: string;
  hasMonogram?: boolean;
};

/** Live preview of the card the recipient receives. Tilts under a mouse; flips to show the note. */
export default function GiftCardPreview({ theme, amount, recipientName, senderName, giftNote, hasMonogram }: GiftCardPreviewProps) {
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const tilt = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || flipped || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.setProperty('--tilt-x', `${(-y * 12).toFixed(2)}deg`);
    cardRef.current.style.setProperty('--tilt-y', `${(x * 12).toFixed(2)}deg`);
    cardRef.current.style.setProperty('--glare-x', `${((x + 0.5) * 100).toFixed(1)}%`);
    cardRef.current.style.setProperty('--glare-y', `${((y + 0.5) * 100).toFixed(1)}%`);
  };

  const resetTilt = () => {
    for (const name of ['--tilt-x', '--tilt-y', '--glare-x', '--glare-y']) cardRef.current?.style.removeProperty(name);
  };

  return (
    <figure className="gift-preview">
      <div className={`gift-preview__stage gift-preview__stage--${theme}`} onPointerMove={tilt} onPointerLeave={resetTilt}>
        <div ref={cardRef} className={`giftcard${flipped ? ' is-flipped' : ''}`}>
          <div className="giftcard__slot" aria-hidden={flipped}>
            <GiftCardFace theme={theme} amount={amount} recipientName={recipientName} senderName={senderName} shineKey={`${theme}-${amount}`} hasMonogram={hasMonogram} />
          </div>
          <div className={`giftcard__face giftcard__back giftcard--${theme}`} aria-hidden={!flipped}>
            <GiftCardMonogram hasMonogram={hasMonogram} />
            <p className="giftcard__note">{giftNote.trim() ? `“${giftNote.trim()}”` : 'Kişisel notunuz burada görünür.'}</p>
            <div className="giftcard__terms">
              <span>PND-GC-••••-••••</span>
              <span>pandiones.com · 12 ay geçerli</span>
            </div>
          </div>
        </div>
        <span className="gift-preview__shadow" aria-hidden="true" />
      </div>
      <figcaption className="gift-preview__caption">
        <span>Canlı önizleme · kod ödeme onaylanınca oluşur</span>
        <button type="button" className="btn btn--link" onClick={() => setFlipped((value) => !value)} aria-pressed={flipped}>
          {flipped ? 'Ön yüzü göster' : 'Notu göster'}
        </button>
      </figcaption>
    </figure>
  );
}
