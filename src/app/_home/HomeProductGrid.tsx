import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { ALL_PRODUCTS_HREF, productHref } from '@/lib/routes';
import { PHOTO_QUALITY } from '@/lib/images';
import RetryButton from './RetryButton';

/** Home product grid: the newest pieces as photos with the name over the image, like the
 *  category cards above. No price, favourite or hover effects here; the product page has those.
 *  Rendered on the server; only the retry button is a client component. */
export default function HomeProductGrid({ products, error }: {
  products: Product[];
  error: string | null;
  hasMore?: boolean;
}) {
  if (error) {
    return (
      <div className="editorial-grid" id="products">
        <div className="collection-load-state" role="alert">
          <p>{error}</p>
          <RetryButton />
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="editorial-grid" id="products">
        <div className="collection-load-state" role="status">
          <p>Henüz yayında parça yok.</p>
          <Link href={ALL_PRODUCTS_HREF} className="btn btn--secondary">
            Yeni gelenlere göz at
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="editorial-grid" id="products">
        {products.map((p) => (
          <article key={p.id} className="product">
            <Link href={productHref(p.slug)} className="photo-button">
              <Image
                src={p.image}
                alt={p.media?.find((m) => m.isCover)?.alt || (p.color ? `${p.name} - ${p.color}` : p.name)}
                width={768}
                height={1024}
                sizes="(max-width: 900px) 50vw, 33vw"
                quality={PHOTO_QUALITY}
                loading="lazy"
              />
              <span className="product-overlay">
                <h3>{p.name}</h3>
              </span>
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
