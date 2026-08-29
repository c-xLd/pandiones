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
  const feature = products[0];
  return (
    <main className={`shop-page category-store category-store--${slug}`}>
      <SiteHeader />
      <nav className="category-breadcrumb" aria-label="Sayfa yolu">
        <a href="/koleksiyon">Koleksiyon</a><span>/</span><span>{title}</span>
      </nav>
      <section className="category-signature" aria-labelledby="category-title">
        <div className="category-signature-copy">
          <div><p>PANDIONES / KATEGORİ</p><span>{String(products.length).padStart(2, '0')} ÜRÜN</span></div>
          <h1 id="category-title">{title}</h1>
          <p>{description}</p>
          <a href="#kategori-urunleri">Seçkiyi incele <span aria-hidden="true">↓</span></a>
        </div>
        {feature && <a className="category-signature-image" href={`/urun/${feature.slug}`} aria-label={`${feature.name} ürününü incele`}><img src={feature.image} alt={feature.name} style={{ objectPosition: feature.imagePosition }} /><span>01 / ÖNE ÇIKAN</span></a>}
      </section>
      <nav className="category-store-tabs" aria-label="Kategoriler">
        <a href="/koleksiyon">Tümü</a>
        {categories.map((category) => <a className={category.slug === slug ? 'active' : ''} href={category.slug === 'ic-giyim' ? '/ic-giyim' : `/koleksiyon/kategori/${category.slug}`} key={category.slug}>{category.label}</a>)}
      </nav>
      {products.length > 0 ? (
        <section className="category-editorial-products" id="kategori-urunleri" aria-label={`${title} ürünleri`}>
          <header><p>SEÇİLİ ÜRÜNLER</p><h2>Tenine yakın,<br /><i>kendine özgü.</i></h2></header>
          {products.map((product, index) => <article className={`category-editorial-card category-editorial-card--${index + 1}`} key={product.id}><a className="category-editorial-media" href={`/urun/${product.slug}`}><img src={product.image} alt={`${product.name}, ${product.color}`} style={{ objectPosition: product.imagePosition }} /><span>0{index + 1}</span><b>İncele ↗</b></a><div><div><p>{product.categoryName} / {product.color}</p><h3><a href={`/urun/${product.slug}`}>{product.name}</a></h3></div><strong>{formatPrice(product.priceKurus)}</strong></div></article>)}
        </section>
      ) : (
        <section className="catalog-empty"><h2>Bu kategoride henüz ürün yok.</h2><a href="/koleksiyon">Koleksiyona dön ↗</a></section>
      )}
      <SiteFooter />
    </main>
  );
}
