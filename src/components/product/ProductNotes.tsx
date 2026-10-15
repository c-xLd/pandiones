import React from 'react';
import Link from 'next/link';
import type { Product } from '@/types';
import TermsButton from './TermsButton';

/** "Bilmen gerekenler": the product's own copy and the things to know, as native disclosure rows.
 *  Used twice: in the desktop notes section below the hero, and inside the phone info sheet
 *  (ProductDetailClient), where "Daha fazla bilgi" (description, details, colour) opens the list;
 *  on desktop that first row is hidden because the story section already shows the copy. */
export default function ProductNotes({ product }: { product: Product }) {
  const hasFabricCare = Boolean(product.material?.trim() || product.care?.trim());
  return (
    <div className="pdp-lower-notes__list">
      <details className="pdp-lower-notes__more" open>
        <summary>Daha fazla bilgi</summary>
        <div className="pdp-lower-notes__body">
          {product.description ? <p>{product.description}</p> : null}
          {product.details?.trim() ? <p>{product.details}</p> : null}
          <p className="pdp-lower-notes__color">{product.color}</p>
        </div>
      </details>
      {hasFabricCare ? (
        <details>
          <summary>Kumaş ve bakım</summary>
          <div className="pdp-lower-notes__body">
            {product.material?.trim() ? <p>{product.material}</p> : null}
            {product.care?.trim() ? <p>{product.care}</p> : null}
            <p>
              <Link href="/bakim-rehberi">Bakım rehberine göz at</Link>
            </p>
          </div>
        </details>
      ) : null}
      <details>
        <summary>Beden ve kalıp</summary>
        <div className="pdp-lower-notes__body">
          <p>Satılan bedenler ve Türkiye ölçüleri beden rehberinde; ölçülerini girerek bedenini hesaplayabilirsin.</p>
          <p>
            <Link href="/beden-rehberi">Beden rehberini aç</Link>
          </p>
        </div>
      </details>
      <details>
        <summary>Teslimat</summary>
        <div className="pdp-lower-notes__body">
          <p>Sipariş ve teslimat koşullarını satış koşullarında inceleyebilirsin.</p>
        </div>
      </details>
      <details>
        <summary>Değişim ve iade</summary>
        <div className="pdp-lower-notes__body">
          <p>İade ve değişim talepleri ürünün durumuna göre değerlendirilir. Ayrıntılar satış koşullarındadır.</p>
        </div>
      </details>
      <TermsButton />
    </div>
  );
}
