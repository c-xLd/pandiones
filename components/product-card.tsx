import type { Product } from '@/lib/format';
import { formatPrice } from '@/lib/format';

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return (
    <article className="catalog-card">
      <a className="catalog-card-image" href={`/urun/${product.slug}`} aria-label={`${product.name} ürününü incele`}>
        <img src={product.image} alt={`${product.name}, ${product.color}`} style={{ objectPosition: product.imagePosition }} />
        <span>{String(index + 1).padStart(2, '0')}</span>
        <b>İNCELE ↗</b>
      </a>
      <div className="catalog-card-meta">
        <div><h2><a href={`/urun/${product.slug}`}>{product.name}</a></h2><p>{product.color}</p></div>
        <p>{formatPrice(product.priceKurus)}</p>
      </div>
    </article>
  );
}

