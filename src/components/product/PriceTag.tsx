import React from 'react';

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);

/**
 * The selling price, with the list price struck through before it when the product has one above the
 * price. No percentage badge: the two real prices speak for themselves. Screen readers hear both labelled.
 */
export default function PriceTag({ price, compareAtPrice, className, id }: { price: number; compareAtPrice?: number | null; className?: string; id?: string }) {
  const was = compareAtPrice && compareAtPrice > price ? compareAtPrice : null;
  return (
    <span className={className ? `price-tag ${className}` : 'price-tag'} id={id}>
      {was ? (
        <>
          <s className="price-tag__was">
            <span className="visually-hidden">Önceki fiyat </span>
            {money(was)}
          </s>{' '}
          <span className="visually-hidden">Şimdiki fiyat </span>
        </>
      ) : null}
      <span className="price-tag__now">{money(price)}</span>
    </span>
  );
}
