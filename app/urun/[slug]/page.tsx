import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AddToCart from '@/components/add-to-cart';
import ProductCard from '@/components/product-card';
import ProductGalleryModal from '@/components/product-gallery-modal';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { formatPrice, getProduct, getProducts } from '@/lib/catalog';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return { title: `${product.name} | Pandiones`, description: product.description, alternates: { canonical: `/urun/${product.slug}` }, openGraph: { title: product.name, description: product.description, images: [product.image] }, twitter: { card: 'summary_large_image', title: product.name, description: product.description, images: [product.image] } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const related = (await getProducts({ category: product.categorySlug, limit: 4 })).filter((item) => item.id !== product.id).slice(0, 3);
  const categoryHref = product.categorySlug === 'ic-giyim' ? '/ic-giyim' : `/koleksiyon/kategori/${product.categorySlug}`;
  const gallery = product.slug === 'fitilli-u-yaka-siyah-crop'
    ? ['/products/crop-siyah-main.png', '/products/crop-siyah-front.png', '/products/crop-siyah-side.png', '/products/crop-siyah-detail.png']
    : [product.image];
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, image: [`https://pandiones.com${product.image}`], description: product.description, sku: product.id, brand: { '@type': 'Brand', name: 'Pandiones' }, offers: { '@type': 'Offer', url: `https://pandiones.com/urun/${product.slug}`, priceCurrency: 'TRY', price: (product.priceKurus / 100).toFixed(2), availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition' } };
  return (
    <main className="shop-page product-page">
      <SiteHeader />
      <nav className="breadcrumbs" aria-label="Sayfa yolu"><a href="/koleksiyon">Koleksiyon</a><span>/</span><a href={categoryHref}>{product.categoryName}</a><span>/</span><span>{product.name}</span></nav>
      <section className="product-detail-v4" aria-labelledby="product-title">
        <ProductGalleryModal images={gallery} productName={product.name} imagePosition={product.imagePosition} />
        <aside className="product-purchase-v4">
          <div className="product-purchase-v4-inner">
          <div className="product-buy-meta"><span>{product.categoryName}</span><span>{product.color}</span></div>
          <h1 id="product-title">{product.name}</h1>
          <div className="product-price-row"><strong>{formatPrice(product.priceKurus)}</strong><span>KDV DAHİL</span></div>
          <p className="product-description">{product.description}</p>
          <AddToCart productId={product.id} productName={product.name} productImage={product.image} sizes={product.sizes} />
          <div className="product-service-notes"><span>Güvenli ödeme</span><span>Beden desteği</span><span>Özenli paketleme</span></div>
          <div className="product-disclosures">
            <details open><summary>Ürün bilgisi <span>+</span></summary><dl><div><dt>Materyal</dt><dd>{product.material}</dd></div><div><dt>Form</dt><dd>{product.fit}</dd></div><div><dt>Renk</dt><dd>{product.color}</dd></div></dl></details>
            <details><summary>Beden ve kalıp <span>+</span></summary><p>Doğru bedeni seçmek için ölçülerini ürün formuyla birlikte değerlendirebilirsin.</p><a href="/beden-rehberi">Beden rehberini aç ↗</a></details>
            <details><summary>Teslimat ve iade <span>+</span></summary><p>Sipariş ve hijyen koşullarına ilişkin güncel bilgileri incele.</p><a href="/teslimat-iade">Koşulları incele ↗</a></details>
          </div>
          {gallery.length > 1 && <nav className="product-view-nav" aria-label="Ürün görünümleri">{gallery.map((_, index) => <a href={`#gorunum-${index + 1}`} key={index}>0{index + 1}</a>)}</nav>}
          </div>
        </aside>
      </section>
      <section className="product-values" aria-label="Pandiones ürün hizmetleri"><article><span>01</span><h2>Beden desteği</h2><p>Karar vermeden önce beden rehberini incele; formuna en uygun seçimi yap.</p><a href="/beden-rehberi">Rehberi aç ↗</a></article><article><span>02</span><h2>Özenli paketleme</h2><p>Siparişin ürünü koruyan, sade ve özenli bir paketleme ile hazırlanır.</p></article><article><span>03</span><h2>Teslimat bilgisi</h2><p>Kargo, değişim ve iade sürecinin tüm adımlarına tek yerden ulaş.</p><a href="/teslimat-iade">Detayları gör ↗</a></article></section>
      {related.length > 0 && <section className="related-products related-products-v2" aria-labelledby="related-title">
        <header><div className="related-products-eyebrow"><span>AYNI DÜNYADAN</span><span>{related.length.toString().padStart(2, '0')} SEÇİM</span></div><h2 id="related-title">Bunları da<br /><i>sevebilirsin.</i></h2><div className="related-products-intro"><p>{product.categoryName} koleksiyonundan, aynı yalınlık ve form duygusunu taşıyan seçkiler.</p><a href={categoryHref}>Tüm {product.categoryName} koleksiyonu <span>↗</span></a></div></header>
        <div className="related-products-grid-v2">{related.map((item, index) => <ProductCard product={item} index={index} key={item.id} />)}</div>
        <footer><p><span>PANDIONES</span> / SENİN SEÇİMİN</p><a href="/koleksiyon">Tüm koleksiyonu keşfet <span>↗</span></a></footer>
      </section>}
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
