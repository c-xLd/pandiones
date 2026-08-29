import Link from 'next/link';
import type { Product } from '@/lib/format';
import { formatPrice } from '@/lib/format';

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return (
    <article className="catalog-card">
      <Link className="catalog-card-image" href={`/urun/${product.slug}`} aria-label={`${product.name} ürününü incele`} prefetch={true}>
        <img
          src={product.image}
          alt={`${product.name}, ${product.color}`}
          style={{ objectPosition: product.imagePosition }}
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding="async"
        />
        <span>{String(index + 1).padStart(2, '0')}</span>
        <b>İNCELE ↗</b>
      </Link>
      <div className="catalog-card-meta">
        <div><h2><Link href={`/urun/${product.slug}`} prefetch={true}>{product.name}</Link></h2><p>{product.color}</p></div>
        <p>{formatPrice(product.priceKurus)}</p>
      </div>
    </article>
  );
}


