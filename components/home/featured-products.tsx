'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/product-card';
import type { Product } from '@/lib/catalog';
import { supabase } from '@/lib/supabase';

export default function FeaturedProducts({ initialProducts }: { initialProducts?: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts || []);

  useEffect(() => {
    if (products.length === 0) {
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
        });
    }
  }, [products.length]);

  if (products.length === 0) return null;

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
        {products.map((product, index) => (
          <ProductCard product={product} index={index} key={product.id} />
        ))}
      </div>
    </section>
  );
}
