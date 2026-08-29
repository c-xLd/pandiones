import Link from 'next/link';
import ProductCard from '@/components/product-card';
import type { Product } from '@/lib/catalog';

export default function SearchResults({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <section className="catalog-empty">
        <h2>Aradığın ifadeyle eşleşen ürün yok.</h2>
        <Link href="/koleksiyon" prefetch={true}>Koleksiyonu gör →</Link>
      </section>
    );
  }

  return (
    <section className="catalog-grid search-grid">
      {products.map((product, index) => (
        <ProductCard product={product} index={index} key={product.id} />
      ))}
    </section>
  );
}

