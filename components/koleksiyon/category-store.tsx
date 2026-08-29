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
  const feature = products[0];
  return (
    <main className={`shop-page category-store category-store--${slug}`}>
      <SiteHeader />
      <nav className="category-breadcrumb" aria-label="Sayfa yolu">
        <Link href="/koleksiyon" prefetch={true}>Koleksiyon</Link><span>/</span><span>{title}</span>
      </nav>
      <section className="category-signature" aria-labelledby="category-title">
        <div className="category-signature-copy">
          <div><p>PANDIONES / KATEGORİ</p><span>{String(products.length).padStart(2, '0')} ÜRÜN</span></div>
          <h1 id="category-title">{title}</h1>
          <p>{description}</p>
          <a href="#kategori-urunleri">Seçkiyi incele <span aria-hidden="true">↓</span></a>
        </div>
        {feature && <Link className="category-signature-image" href={`/urun/${feature.slug}`} aria-label={`${feature.name} ürününü incele`} prefetch={true}><img src={feature.image} alt={feature.name} style={{ objectPosition: feature.imagePosition }} loading="eager" decoding="async" /><span>01 / ÖNE ÇIKAN</span></Link>}
      </section>
      <nav className="category-store-tabs" aria-label="Kategoriler">
        <Link href="/koleksiyon" prefetch={true}>Tümü</Link>
        {categories.map((category) => <Link className={category.slug === slug ? 'active' : ''} href={`/${category.slug}`} key={category.slug} prefetch={true}>{category.label}</Link>)}
      </nav>
      {products.length > 0 ? (
        <section className="category-editorial-products" id="kategori-urunleri" aria-label={`${title} ürünleri`}>
          <header><p>SEÇİLİ ÜRÜNLER</p><h2>Tenine yakın,<br /><i>kendine özgü.</i></h2></header>
          {products.map((product, index) => <article className={`category-editorial-card category-editorial-card--${index + 1}`} key={product.id}><Link className="category-editorial-media" href={`/urun/${product.slug}`} prefetch={true}><img src={product.image} alt={`${product.name}, ${product.color}`} style={{ objectPosition: product.imagePosition }} loading={index < 3 ? 'eager' : 'lazy'} decoding="async" /><span>0{index + 1}</span><b>İncele ↗</b></Link><div><div><p>{product.categoryName} / {product.color}</p><h3><Link href={`/urun/${product.slug}`} prefetch={true}>{product.name}</Link></h3></div><strong>{formatPrice(product.priceKurus)}</strong></div></article>)}
        </section>
      ) : (
        <section className="catalog-empty"><h2>Bu kategoride henüz ürün yok.</h2><Link href="/koleksiyon" prefetch={true}>Koleksiyona dön ↗</Link></section>
      )}
      <SiteFooter />
    </main>
  );
}

