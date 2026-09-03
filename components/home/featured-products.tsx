'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/product-card';
import type { Product } from '@/lib/catalog';
import { supabase } from '@/lib/supabase';

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    slug: 'simli-destekli-bustiyer-takim',
    name: 'SİMLİ BÜSTİYER TAKIM',
    categorySlug: 'ic-giyim',
    categoryName: 'Dantel Serisi',
    priceKurus: 89900,
    color: 'Siyah Simli',
    image: '/products/simli-bustiyer-takim.webp',
    imagePosition: 'center 20%',
    description: 'Özel simli kumaş ve balenli destek',
    material: 'Poliamid & Sim · Balenli Destek',
    fit: 'Destekli & Toparlayıcı',
    sizes: ['75B', '80B', '85B', '90B'],
    featuredRank: 1,
  },
  {
    id: 'p2',
    slug: 'cizgili-dantelli-takim',
    name: 'ÇİZGİLİ DANTELLİ TAKIM',
    categorySlug: 'ic-giyim',
    categoryName: 'Dantel Serisi',
    priceKurus: 94900,
    color: 'Bordo / Şarap',
    image: '/products/cizgili-dantelli-takim.webp',
    imagePosition: 'center 25%',
    description: 'Yumuşak kap ve balensiz rahatlık',
    material: '%88 Poliamid · Yumuşak Kap',
    fit: 'Balensiz Rahat Kalıp',
    sizes: ['75B', '80B', '85B', '90B'],
    featuredRank: 2,
  },
  {
    id: 'p3',
    slug: 'fitilli-v-yaka-crop-bustiyer',
    name: 'FİTİLLİ V-YAKA CROP',
    categorySlug: 'crop-bustiyer',
    categoryName: 'Crop Büstiyer',
    priceKurus: 54900,
    color: 'Melanj Gri',
    image: '/products/gri-crop-bustiyer.webp',
    imagePosition: 'center 30%',
    description: 'Günlük ve özel kombinler için',
    material: '%95 Pamuk, %5 Elastan',
    fit: 'Rahat & Esnek Fit',
    sizes: ['XS', 'S', 'M', 'L'],
    featuredRank: 3,
  },
  {
    id: 'p4',
    slug: 'fitilli-u-yaka-siyah-crop',
    name: 'FİTİLLİ U-YAKA SİYAH CROP',
    categorySlug: 'crop-bustiyer',
    categoryName: 'Günlük Seri',
    priceKurus: 57900,
    color: 'Mat Siyah',
    image: '/products/crop-siyah-main.webp',
    imagePosition: 'center 20%',
    description: 'Geniş askılı, derin U yaka kesimli büstiyer',
    material: '%92 Mikrofiber, %8 Spandeks',
    fit: 'Sıkı & Toparlayıcı Kalıp',
    sizes: ['XS', 'S', 'M', 'L'],
    featuredRank: 4,
  },
];

export default function FeaturedProducts({
  initialProducts,
  mood,
}: {
  initialProducts?: Product[];
  mood?: 'soft' | 'bold';
}) {
  const [products, setProducts] = useState<Product[]>(
    initialProducts && initialProducts.length > 0 ? initialProducts : FALLBACK_PRODUCTS
  );

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('status', 'published')
      .order('featured_rank', { ascending: true })
      .limit(8)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setProducts(
            data.map((row) => ({
              id: row.id,
              slug: row.slug,
              name: row.name,
              categorySlug: row.category_slug,
              categoryName: row.category_name,
              priceKurus: row.price_kurus,
              color: row.color,
              image: row.image,
              imagePosition: row.image_position,
              description: row.description,
              material: row.material,
              fit: row.fit,
              sizes: typeof row.sizes_json === 'string' ? JSON.parse(row.sizes_json) : row.sizes_json,
              featuredRank: row.featured_rank,
            }))
          );
        }
      })
      .catch((err) => {
        console.warn('FeaturedProducts Supabase fetch error, keeping fallbacks:', err);
      });
  }, []);

  const displayedProducts = mood
    ? [...products].sort((a, b) => {
        if (mood === 'soft') {
          const aSoft = a.categorySlug === 'crop-bustiyer' ? -1 : 1;
          const bSoft = b.categorySlug === 'crop-bustiyer' ? -1 : 1;
          return aSoft - bSoft;
        } else {
          const aBold = a.categorySlug === 'ic-giyim' || a.categorySlug === 'gecelik' ? -1 : 1;
          const bBold = b.categorySlug === 'ic-giyim' || b.categorySlug === 'gecelik' ? -1 : 1;
          return aBold - bBold;
        }
      }).slice(0, 4)
    : products.slice(0, 4);

  return (
    <section className="products" id="products" aria-labelledby="products-title">
      <header className="section-head">
        <div>
          <p className="section-kicker">SANA ÖZEL SEÇİMLER</p>
          <h2 id="products-title">YENİ FORMLAR</h2>
        </div>
        <Link href="/koleksiyon">
          Tümünü gör <span>→</span>
        </Link>
      </header>
      <div className="product-grid">
        {displayedProducts.map((product, index) => (
          <ProductCard product={product} index={index} key={product.id} />
        ))}
      </div>
    </section>
  );
}
