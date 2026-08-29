import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import ProductDetails from '@/components/urun/product-details';
import ProductValues from '@/components/urun/product-values';
import RelatedProducts from '@/components/urun/related-products';
import { getProduct, getProducts } from '@/lib/catalog';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return { 
    title: `${product.name} | Pandiones`, 
    description: product.description, 
    alternates: { canonical: `/urun/${product.slug}` }, 
    openGraph: { title: product.name, description: product.description, images: [product.image] }, 
    twitter: { card: 'summary_large_image', title: product.name, description: product.description, images: [product.image] } 
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  
  const related = (await getProducts({ category: product.categorySlug, limit: 4 }))
    .filter((item) => item.id !== product.id)
    .slice(0, 3);
  
  const categoryHref = product.categorySlug === 'ic-giyim' ? '/ic-giyim' : `/koleksiyon/kategori/${product.categorySlug}`;
  
  const gallery = product.slug === 'fitilli-u-yaka-siyah-crop'
    ? ['/products/crop-siyah-main.png', '/products/crop-siyah-front.png', '/products/crop-siyah-side.png', '/products/crop-siyah-detail.png']
    : [product.image];
    
  const jsonLd = { 
    '@context': 'https://schema.org', 
    '@type': 'Product', 
    name: product.name, 
    image: [`https://pandiones.com${product.image}`], 
    description: product.description, 
    sku: product.id, 
    brand: { '@type': 'Brand', name: 'Pandiones' }, 
    offers: { '@type': 'Offer', url: `https://pandiones.com/urun/${product.slug}`, priceCurrency: 'TRY', price: (product.priceKurus / 100).toFixed(2), availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition' } 
  };
  
  return (
    <main className="shop-page product-page">
      <SiteHeader />
      <nav className="breadcrumbs" aria-label="Sayfa yolu">
        <a href="/koleksiyon">Koleksiyon</a>
        <span>/</span>
        <a href={categoryHref}>{product.categoryName}</a>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      
      <ProductDetails product={product} gallery={gallery} categoryHref={categoryHref} />
      <ProductValues />
      <RelatedProducts related={related} categoryName={product.categoryName} categoryHref={categoryHref} />
      
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
