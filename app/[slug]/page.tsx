import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import ProductDetails from '@/components/urun/product-details';
import ProductValues from '@/components/urun/product-values';
import RelatedProducts from '@/components/urun/related-products';
import { getProduct, getProducts } from '@/lib/catalog';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name} | Pandiones`,
    description: product.description,
    alternates: { canonical: `/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  };
}

export default async function DirectProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const related = (await getProducts({ category: product.categorySlug, limit: 4 }))
    .filter((item) => item.id !== product.id)
    .slice(0, 3);

  const categoryHref = `/${product.categorySlug}`;

  const gallery =
    product.slug === 'fitilli-u-yaka-siyah-crop'
      ? [
          '/products/crop-siyah-main.png',
          '/products/crop-siyah-front.png',
          '/products/crop-siyah-side.png',
          '/products/crop-siyah-detail.png',
        ]
      : [product.image];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: [`https://pandiones.com${product.image}`],
    description: product.description,
    sku: product.id,
    brand: { '@type': 'Brand', name: 'Pandiones' },
    offers: {
      '@type': 'Offer',
      url: `https://pandiones.com/${product.slug}`,
      priceCurrency: 'TRY',
      price: (product.priceKurus / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  return (
    <main className="shop-page product-page">
      <SiteHeader />
      <ProductDetails product={product} gallery={gallery} categoryHref={categoryHref} />
      <ProductValues />
      <RelatedProducts
        related={related}
        categoryName={product.categoryName}
        categoryHref={categoryHref}
      />

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
        <Link href={categoryHref} prefetch={true}>
          {product.categoryName}
        </Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>

      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
