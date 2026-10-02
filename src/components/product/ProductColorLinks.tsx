import React from 'react';
import Link from 'next/link';
import type { Product, SiblingColor } from '@/types';
import { productHref } from '@/lib/routes';

/** The product's colour, plus links to its real sibling colours (each its own product page). */
export default function ProductColorLinks({ current, siblings = [] }: { current: Product; siblings?: SiblingColor[] }) {
  const linked = siblings.filter((sibling) => sibling.id !== current.id && sibling.image);

  return (
    <nav className="pdp-colors" aria-label="Renk seçenekleri">
      <div className="pdp-colors__inner">
        <span className="pdp-colors__label">Renk</span>
        <ul className="pdp-colors__list">
          <li>
            <span className="pdp-colors__chip is-current" aria-current="true">{current.color}</span>
          </li>
          {linked.map((sibling) => (
            <li key={sibling.id}>
              <Link href={productHref(sibling.slug)} className="pdp-colors__chip" aria-label={`${sibling.color} rengini incele`}>
                {sibling.color}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
