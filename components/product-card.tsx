import Link from 'next/link';
import type { Product } from '@/lib/format';
import { formatPrice } from '@/lib/format';

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return (
    <article className="catalog-card">
      <Link
        className="catalog-card-image"
        href={`/${product.slug}`}
        aria-hidden="true"
        tabIndex={-1}
        prefetch={true}
      >
        <img
          src={product.image || '/products/simli-bustiyer-takim.webp'}
          alt=""
          style={{ objectPosition: product.imagePosition || 'center center' }}
          width="600"
          height="800"
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding="async"
        />
        <span>{String(index + 1).padStart(2, '0')}</span>
        <b>İNCELE ↗</b>
      </Link>
      <div className="catalog-card-meta">
        <div>
          <h3>
            <Link href={`/${product.slug}`} prefetch={true}>
              {product.name}
            </Link>
          </h3>
          <p>{product.color}</p>
        </div>
        <p>{formatPrice(product.priceKurus)}</p>
      </div>
    </article>
  );
}


