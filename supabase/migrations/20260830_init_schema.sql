-- 1. Create site_categories table
CREATE TABLE IF NOT EXISTS public.site_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  category_name TEXT NOT NULL,
  price_kurus INT NOT NULL DEFAULT 0,
  color TEXT NOT NULL,
  image TEXT NOT NULL,
  image_position TEXT DEFAULT 'center 20%',
  description TEXT NOT NULL,
  material TEXT NOT NULL,
  fit TEXT NOT NULL,
  sizes_json JSONB NOT NULL DEFAULT '["S","M","L"]'::jsonb,
  featured_rank INT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create cart_items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'M',
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS & add public access policies
ALTER TABLE public.site_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read site_categories" ON public.site_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read products" ON public.products FOR SELECT USING (status = 'published');
CREATE POLICY "Allow public read insert update delete cart_items" ON public.cart_items FOR ALL USING (true) WITH CHECK (true);

-- 4. Seed categories
INSERT INTO public.site_categories (slug, name, description, display_order)
VALUES 
  ('ic-giyim', 'İç Giyim', 'Dantel, destek ve rahatlığı aynı formda buluşturan Pandiones takımları.', 1),
  ('crop-bustiyer', 'Crop Büstiyer', 'Gündelik stile eşlik eden pedli, fitilli ve yalın crop formlar.', 2),
  ('gecelik', 'Gecelik', 'Tül ve dantel katmanlarıyla hafif, akışkan gece silüetleri.', 3)
ON CONFLICT (slug) DO NOTHING;

-- 5. Seed products
INSERT INTO public.products (slug, name, category_slug, category_name, price_kurus, color, image, image_position, description, material, fit, sizes_json, featured_rank, status)
VALUES
  (
    'simli-destekli-bustiyer-takim',
    'Simli Destekli Büstiyer Takım',
    'ic-giyim',
    'İç Giyim',
    89900,
    'Siyah Simli',
    '/products/simli-bustiyer-takim.webp',
    'center 20%',
    'Simli dokusu, balenli ve destekli yapısıyla feminen hatları öne çıkaran özel tasarım takım.',
    '%85 Poliamid, %15 Elastan',
    'Destekli & Balenli Kalıp',
    '["75B", "80B", "85B", "90B"]'::jsonb,
    1,
    'published'
  ),
  (
    'cizgili-dantelli-takim',
    'Çizgili Dantelli Destekli Takım',
    'ic-giyim',
    'İç Giyim',
    94900,
    'Bordo / Şarap',
    '/products/cizgili-dantelli-takim.webp',
    'center 25%',
    'Zarif çizgi ve dantel işlemeleriyle hem günlük kullanımda hem de özel anlarda konfor sunar.',
    '%90 Poliamid, %10 Elastan',
    'Destekli & Toparlayıcı Form',
    '["75B", "80B", "85B", "90B"]'::jsonb,
    2,
    'published'
  ),
  (
    'fitilli-v-yaka-crop-bustiyer',
    'Fitilli V Yaka Pedli Crop Büstiyer',
    'crop-bustiyer',
    'Crop Büstiyer',
    54900,
    'Melanj Gri',
    '/products/gri-crop-bustiyer.webp',
    'center 30%',
    'Çıkarılabilir pedli yapısı ve fitilli esnek dokusuyla gün boyu teninizle bütünleşen crop büstiyer.',
    '%95 Pamuk, %5 Elastan',
    'Rahat & Esnek Fit',
    '["XS", "S", "M", "L"]'::jsonb,
    3,
    'published'
  ),
  (
    'fitilli-u-yaka-siyah-crop',
    'Fitilli U Yaka Siyah Crop Büstiyer',
    'crop-bustiyer',
    'Crop Büstiyer',
    57900,
    'Mat Siyah',
    '/products/crop-siyah-main.webp',
    'center 20%',
    'Geniş askılı, derin U yaka kesimli, ceket içi veya tek başına kullanıma uygun büstiyer.',
    '%92 Mikrofiber, %8 Spandeks',
    'Sıkı & Toparlayıcı Kalıp',
    '["XS", "S", "M", "L"]'::jsonb,
    4,
    'published'
  ),
  (
    'tul-dantelli-gecelik-takim',
    'Tül Dantelli Gece Takımı',
    'gecelik',
    'Gecelik',
    82900,
    'Gece Siyahı',
    '/products/tul-babydoll-set.webp',
    'center 15%',
    'Hafif tül kumaşı ve göğüs altı dantel geçişleriyle akıcı, zarif ve özgür bir gece deneyimi.',
    '%100 İpeksi Tül & Fransız Dantel',
    'Akışkan & Dökümlü Silüet',
    '["S", "M", "L", "XL"]'::jsonb,
    5,
    'published'
  )
ON CONFLICT (slug) DO NOTHING;
