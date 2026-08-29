import Link from 'next/link';
import type { Product } from '@/lib/catalog';
import ProductCard from '@/components/product-card';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';

export default function CollectionStore({ products }: { products: Product[] }) {
  return (
    <main className="shop-page collection-store">
      <SiteHeader />

      <section className="collection-store-intro" aria-labelledby="collection-store-title">
        <div className="collection-store-meta">
          <span>PANDIONES / 2026</span>
          <span>{String(products.length).padStart(2, '0')} ÜRÜN</span>
        </div>
        <div className="collection-store-lead">
          <div className="collection-store-copy">
            <p>GÜNLÜKTEN GECEYE</p>
            <h1 id="collection-store-title">Koleksiyon</h1>
            <p>Dantel, tül ve tenle uyumlanan günlük formlar. Gösterişten uzak, kendinden emin bir seçki.</p>
            <a href="#koleksiyon-urunleri">Ürünleri incele <span aria-hidden="true">↓</span></a>
          </div>
          <figure className="collection-store-cover">
            <img src="/products/crop-siyah-main.png" alt="Siyah fitilli crop ürün çekimi" loading="lazy" decoding="async" />
            <figcaption><span>YENİ ÇEKİM / SİYAH CROP</span><span>2026</span></figcaption>
          </figure>
        </div>
      </section>

      <nav className="collection-category-links" aria-label="Koleksiyon kategorileri">
        <span>KATEGORİLER</span>
        <Link href="/ic-giyim" prefetch={true}>İç Giyim <i>↗</i></Link>
        <Link href="/crop-bustiyer" prefetch={true}>Crop Büstiyer <i>↗</i></Link>
        <Link href="/gecelik" prefetch={true}>Gecelik <i>↗</i></Link>
      </nav>

      <div className="collection-store-rail" id="koleksiyon-urunleri">
        <span>TÜM ÜRÜNLER</span><span>DANTEL · TÜL · CROP</span><span>{products.length} SONUÇ</span>
      </div>

      <section className="collection-store-products" aria-label="Koleksiyon ürünleri">
        {products.map((product, index) => <ProductCard product={product} index={index} key={product.id} />)}
      </section>

      <section className="collection-crop-story" aria-labelledby="crop-story-title">
        <figure className="collection-crop-story-main"><img src="/products/crop-siyah-main.png" alt="Siyah fitilli crop ön görünüm" loading="lazy" decoding="async" /></figure>
        <div className="collection-crop-story-copy">
          <p>YENİ / GÜNLÜK FORM</p>
          <h2 id="crop-story-title">Sade olanın<br /><i>gücü.</i></h2>
          <p>Fitilli siyah crop; denimle, ev stilinde veya katmanlı kombinlerde günün ritmine uyum sağlayan yalın bir form.</p>
          <Link href="/iletisim" prefetch={true}>Ürün hakkında bilgi <span aria-hidden="true">↗</span></Link>
        </div>
        <figure className="collection-crop-story-detail"><img src="/products/crop-siyah-detail.png" alt="Siyah fitilli crop kumaş ve yaka detayı" loading="lazy" decoding="async" /></figure>
      </section>

      <SiteFooter />
    </main>
  );
}

