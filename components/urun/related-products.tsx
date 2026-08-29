import Link from 'next/link';
import ProductCard from '@/components/product-card';
import type { Product } from '@/lib/catalog';

export default function RelatedProducts({
  related,
  categoryName,
  categoryHref,
}: {
  related: Product[];
  categoryName: string;
  categoryHref: string;
}) {
  if (related.length === 0) return null;

  return (
    <section className="related-products related-products-v2" aria-labelledby="related-title">
      <header>
        <div className="related-products-eyebrow">
          <span>AYNI DÜNYADAN</span>
          <span>{related.length.toString().padStart(2, '0')} SEÇİM</span>
        </div>
        <h2 id="related-title">
          Bunları da
          <br />
          <i>sevebilirsin.</i>
        </h2>
        <div className="related-products-intro">
          <p>{categoryName} koleksiyonundan, aynı yalınlık ve form duygusunu taşıyan seçkiler.</p>
          <Link href={categoryHref} prefetch={true}>
            Tüm {categoryName} koleksiyonu <span>→</span>
          </Link>
        </div>
      </header>
      <div className="related-products-grid-v2">
        {related.map((item, index) => (
          <ProductCard product={item} index={index} key={item.id} />
        ))}
      </div>
      <footer>
        <p>
          <span>PANDIONES</span> / SENİN SEÇİMİN
        </p>
        <Link href="/koleksiyon" prefetch={true}>
          Tüm koleksiyonu keşfet <span>→</span>
        </Link>
      </footer>
    </section>
  );
}

