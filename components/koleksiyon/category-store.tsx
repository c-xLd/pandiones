import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, type Product } from '@/lib/catalog';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';

type CategoryStoreProps = {
  title: string;
  description: string;
  slug: string;
  products: Product[];
};

const categories = [
  { slug: 'ic-giyim', label: 'İç Giyim' },
  { slug: 'crop-bustiyer', label: 'Crop Büstiyer' },
  { slug: 'gecelik', label: 'Gecelik' },
];

const categoryEditorial: Record<string, { chapter: string; statement: string; italic: string }> = {
  'ic-giyim': { chapter: 'Dantel / Destek / Doku', statement: 'Tenine yakın.', italic: 'Kendine ait.' },
  'crop-bustiyer': { chapter: 'Günlük / Yalın / Esnek', statement: 'Hafif bir form.', italic: 'Özgür bir ritim.' },
  gecelik: { chapter: 'Tül / Akış / Gece', statement: 'Geceye hafif.', italic: 'Sana yakın.' },
};

export default function CategoryStore({ title, description, slug, products }: CategoryStoreProps) {
  const featuredProduct = products[0];
  const editorial = categoryEditorial[slug] ?? categoryEditorial['ic-giyim'];

  return (
    <main className={`shop-page category-store-v2 category-store-v2--${slug}`}>
      <SiteHeader />

      <section className="category-cover" aria-labelledby="category-title">
        <div className="category-cover-copy">
          <div className="category-cover-index" aria-label={`${products.length} ürün`}>
            <span>KOLEKSİYON / {new Date().getFullYear()}</span>
            <span>{String(products.length).padStart(2, '0')} PARÇA</span>
          </div>

          <div className="category-cover-heading">
            <p>{editorial.chapter}</p>
            <h1 id="category-title">
              {title}
              <i>Seçkisi</i>
            </h1>
          </div>

          <div className="category-cover-bottom">
            <p>{description}</p>
            <a href="#kategori-urunleri">
              Ürünleri Gör
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        {featuredProduct ? (
          <Link
            className="category-cover-media"
            href={`/${featuredProduct.slug}`}
            aria-label={`${featuredProduct.name} ürününü incele`}
            prefetch
          >
            <Image
              src={featuredProduct.image}
              alt={`${featuredProduct.name}, ${featuredProduct.color}`}
              fill
              priority
              sizes="(max-width: 760px) 100vw, 54vw"
              style={{ objectPosition: featuredProduct.imagePosition || 'center center' }}
            />
            <span className="category-cover-caption">
              <span>
                <small>Öne Çıkan / 01</small>
                <strong>{featuredProduct.name}</strong>
              </span>
              <b>{formatPrice(featuredProduct.priceKurus)}</b>
            </span>
          </Link>
        ) : null}
      </section>

      <nav className="category-switcher" aria-label="Kategoriler">
        <Link href="/koleksiyon" prefetch>Tüm Koleksiyon</Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/${category.slug}`}
            prefetch
            aria-current={category.slug === slug ? 'page' : undefined}
          >
            {category.label}
          </Link>
        ))}
      </nav>

      {products.length > 0 ? (
        <section className="category-selection" id="kategori-urunleri" aria-labelledby="selection-title">
          <header className="category-selection-header">
            <p>
              <span>Seçili Formlar</span>
              <span>{String(products.length).padStart(2, '0')} Ürün</span>
            </p>
            <h2 id="selection-title">
              {editorial.statement}
              <i>{editorial.italic}</i>
            </h2>
            <p>Her parçayı yakından incele; renk, kalıp ve mevcut beden bilgisini ürün sayfasında keşfet.</p>
          </header>

          <div className="category-selection-grid">
            {products.map((product, index) => (
              <article className="category-selection-card" key={product.id}>
                <Link
                  className="category-selection-media"
                  href={`/${product.slug}`}
                  aria-label={`${product.name} ürününü incele`}
                  prefetch
                >
                  <Image
                    src={product.image}
                    alt={`${product.name}, ${product.color}`}
                    fill
                    sizes="(max-width: 640px) 92vw, (max-width: 1000px) 50vw, 56vw"
                    priority={index === 0}
                    style={{ objectPosition: product.imagePosition || 'center center' }}
                  />
                  <span className="category-card-number">/{String(index + 1).padStart(2, '0')}</span>
                  <span className="category-card-action">Ürünü İncele <b aria-hidden="true">↗</b></span>
                </Link>
                <div className="category-selection-meta">
                  <div>
                    <p>{product.color}</p>
                    <h3><Link href={`/${product.slug}`} prefetch>{product.name}</Link></h3>
                  </div>
                  <p>{formatPrice(product.priceKurus)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="catalog-empty">
          <h2>Bu kategoride henüz ürün bulunmuyor.</h2>
          <Link href="/koleksiyon" prefetch>Tüm Koleksiyonu Gör ↗</Link>
        </section>
      )}

      <nav className="breadcrumbs breadcrumb-above-footer" aria-label="Sayfa yolu">
        <Link href="/" prefetch>Ana Sayfa</Link>
        <span>/</span>
        <Link href="/koleksiyon" prefetch>Koleksiyon</Link>
        <span>/</span>
        <span>{title}</span>
      </nav>

      <SiteFooter />
    </main>
  );
}
