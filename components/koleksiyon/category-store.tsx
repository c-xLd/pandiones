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

export default function CategoryStore({ title, description, slug, products }: CategoryStoreProps) {
  const primaryFeature = products[0];
  const secondaryFeature = products[1] || products[0];

  return (
    <main className={`shop-page category-store category-store--${slug}`}>
      <SiteHeader />

      {/* Avant-Garde High-Fashion Category Hero Stage */}
      <section className="category-hero-stage" aria-labelledby="category-title">
        <div className="hero-stage-grain" aria-hidden="true" />

        <div className="hero-stage-container">
          {/* Left Column: Architectural Editorial Typography */}
          <div className="hero-stage-copy">
            <div className="hero-stage-tag">
              <span className="live-dot" />
              <span>PANDIONES // {title.toUpperCase()} SERİSİ</span>
              <span className="count-tag">{String(products.length).padStart(2, '0')} PARÇA</span>
            </div>

            <h1 id="category-title" className="hero-stage-title">
              {title}
              <span className="title-sub-italic">Formları</span>
            </h1>

            <p className="hero-stage-desc">{description}</p>

            <div className="hero-stage-specs">
              <span>%100 YERLİ ÜRETİM</span>
              <span>·</span>
              <span>S — L BEDEN SEÇENEKLERİ</span>
              <span>·</span>
              <span>24 SAATTE KARGO</span>
            </div>

            <div className="hero-stage-actions">
              <a href="#kategori-urunleri" className="hero-explore-btn">
                <span>SEÇKİYİ İNCELE ({products.length})</span>
                <span className="btn-arrow" aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          {/* Right Column: Overlapping Floating Lookbook Frames */}
          {primaryFeature && (
            <div className="hero-stage-lookbook" aria-hidden="true">
              {/* Secondary Floating Angled Frame */}
              {secondaryFeature && (
                <figure className="stage-frame stage-frame-secondary">
                  <img
                    src={secondaryFeature.image}
                    alt={secondaryFeature.name}
                    style={{ objectPosition: secondaryFeature.imagePosition || 'center 30%' }}
                    width="260"
                    height="340"
                    loading="eager"
                    decoding="async"
                  />
                  <figcaption>02 / DETAY DOKUSU</figcaption>
                </figure>
              )}

              {/* Primary Main Lookbook Frame */}
              <figure className="stage-frame stage-frame-primary">
                <Link href={`/${primaryFeature.slug}`} tabIndex={-1}>
                  <img
                    src={primaryFeature.image}
                    alt={primaryFeature.name}
                    style={{ objectPosition: primaryFeature.imagePosition || 'center center' }}
                    width="320"
                    height="420"
                    loading="eager"
                    decoding="async"
                  />
                </Link>
                <figcaption>
                  <span>01 // ÖNE ÇIKAN</span>
                  <strong>{primaryFeature.name}</strong>
                </figcaption>
              </figure>
            </div>
          )}
        </div>

        {/* Integrated Category Switcher Tabs */}
        <nav className="hero-stage-tabs" aria-label="Kategoriler">
          <Link href="/koleksiyon" prefetch={true} className="tab-link">
            TÜM KOLEKSİYON
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              prefetch={true}
              className={`tab-link ${cat.slug === slug ? 'active' : ''}`}
            >
              {cat.label.toUpperCase()}
            </Link>
          ))}
        </nav>
      </section>

      {/* Product Collection Grid */}
      {products.length > 0 ? (
        <section className="category-products-section" id="kategori-urunleri" aria-label={`${title} ürünleri`}>
          <div className="category-section-header">
            <div>
              <p className="section-kicker">KOLEKSİYON PARÇALARI</p>
              <h2>Teninle Uyumlu, <i>Özgün Kesimler.</i></h2>
            </div>
            <span className="section-counter">{products.length} ÜRÜN LİSTELENDİ</span>
          </div>

          <div className="category-products-grid">
            {products.map((product, index) => (
              <article className="catalog-card" key={product.id}>
                <Link
                  className="catalog-card-image"
                  href={`/${product.slug}`}
                  aria-label={`${product.name} ürününü incele`}
                  prefetch={true}
                >
                  <img
                    src={product.image}
                    alt={`${product.name}, ${product.color}`}
                    style={{ objectPosition: product.imagePosition || 'center center' }}
                    width="600"
                    height="800"
                    loading={index < 4 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                  <span>0{index + 1}</span>
                  <b>İNCELE ↗</b>
                </Link>
                <div className="catalog-card-meta">
                  <div>
                    <h2>
                      <Link href={`/${product.slug}`} prefetch={true}>
                        {product.name}
                      </Link>
                    </h2>
                    <p>{product.color}</p>
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
          <Link href="/koleksiyon" prefetch={true}>
            Tüm Koleksiyonu Gör ↗
          </Link>
        </section>
      )}

      {/* Breadcrumb Navigation - Always Positioned Above Footer */}
      <nav className="breadcrumbs breadcrumb-above-footer" aria-label="Sayfa yolu">
        <Link href="/" prefetch={true}>
          Ana Sayfa
        </Link>
        <span>/</span>
        <Link href="/koleksiyon" prefetch={true}>
          Koleksiyon
        </Link>
        <span>/</span>
        <span>{title}</span>
      </nav>

      <SiteFooter />
    </main>
  );
}
