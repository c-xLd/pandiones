CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  category_name TEXT NOT NULL,
  price_kurus INTEGER NOT NULL CHECK (price_kurus >= 0),
  color TEXT NOT NULL,
  image TEXT NOT NULL,
  image_position TEXT NOT NULL DEFAULT '50% 38%',
  description TEXT NOT NULL,
  material TEXT NOT NULL,
  fit TEXT NOT NULL,
  sizes_json TEXT NOT NULL,
  featured_rank INTEGER,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category_slug, status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured_rank) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 10),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(cart_id, product_id, size)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);

