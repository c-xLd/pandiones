import { supabase } from './supabase';

export type Product = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  priceKurus: number;
  color: string;
  image: string;
  imagePosition: string;
  description: string;
  material: string;
  fit: string;
  sizes: string[];
  featuredRank: number | null;
};

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount / 100);
}

export async function getProducts(options: { category?: string; query?: string; limit?: number } = {}) {
  let query = supabase.from('products').select('*').eq('status', 'published');

  if (options.category && options.category !== 'yeni') {
    query = query.eq('category_slug', options.category);
  }

  if (options.query) {
    query = query.or(`name.ilike.%${options.query}%,description.ilike.%${options.query}%,color.ilike.%${options.query}%`);
  }

  const limit = Math.min(Math.max(options.limit ?? 24, 1), 48);
  query = query.limit(limit);

  // ordering by featured_rank nulls last, then created_at desc
  query = query.order('featured_rank', { ascending: true, nullsFirst: false })
               .order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return data.map((row) => ({
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
  })) as Product[];
}

export async function getProduct(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    categorySlug: data.category_slug,
    categoryName: data.category_name,
    priceKurus: data.price_kurus,
    color: data.color,
    image: data.image,
    imagePosition: data.image_position,
    description: data.description,
    material: data.material,
    fit: data.fit,
    sizes: typeof data.sizes_json === 'string' ? JSON.parse(data.sizes_json) : data.sizes_json,
    featuredRank: data.featured_rank,
  } as Product;
}

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  displayOrder: number;
};

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('site_categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error || !data) {
    return [
      { id: '1', slug: 'ic-giyim', name: 'İç Giyim', description: 'Dantel, destek ve rahatlığı aynı formda buluşturan Pandiones takımları.', displayOrder: 1 },
      { id: '2', slug: 'crop-bustiyer', name: 'Crop Büstiyer', description: 'Gündelik stile eşlik eden pedli, fitilli ve yalın crop formlar.', displayOrder: 2 },
      { id: '3', slug: 'gecelik', name: 'Gecelik', description: 'Tül ve dantel katmanlarıyla hafif, akışkan gece silüetleri.', displayOrder: 3 },
    ];
  }

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    displayOrder: row.display_order || 0,
  }));
}

