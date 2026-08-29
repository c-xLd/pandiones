import Link from 'next/link';
import ProductCard from '@/components/product-card';
import type { Product } from '@/lib/catalog';

export default function SearchResults({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <section className="catalog-empty max-w-xl mx-auto py-16 text-center space-y-6">
        <span className="text-[10px] tracking-[0.24em] uppercase text-[var(--accent)] font-medium">
          SONUÇ // 00
        </span>
        <h2 className="font-editorial text-3xl sm:text-4xl font-light uppercase tracking-[-0.02em]">
          Eşleşen Parça <i className="italic font-normal">Bulunamadı.</i>
        </h2>
        <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] max-w-md mx-auto leading-relaxed">
          Farklı bir arama terimi deneyebilir veya öne çıkan koleksiyonlarımızı keşfedebilirsiniz.
        </p>
        <div className="pt-4 flex flex-wrap justify-center gap-3">
          <Link
            href="/koleksiyon"
            prefetch={true}
            className="inline-flex items-center px-6 py-3 border border-[var(--border)] text-xs uppercase tracking-widest hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors"
          >
            Tüm Koleksiyon ↗
          </Link>
          <Link
            href="/ic-giyim"
            prefetch={true}
            className="inline-flex items-center px-6 py-3 border border-[var(--border)] text-xs uppercase tracking-widest hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors"
          >
            İç Giyim ↗
          </Link>
          <Link
            href="/crop-bustiyer"
            prefetch={true}
            className="inline-flex items-center px-6 py-3 border border-[var(--border)] text-xs uppercase tracking-widest hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors"
          >
            Crop Büstiyer ↗
          </Link>
        </div>
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

