import ProductCard from '@/components/product-card';
import type { Product } from '@/lib/catalog';

export default function SearchResults({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <section className="catalog-empty">
        <h2>Aradığın ifadeyle eşleşen ürün yok.</h2>
        <a href="/koleksiyon">Koleksiyonu gör →</a>
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
