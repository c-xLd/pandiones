import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ensureCatalogSchema, getDatabase } from '@/lib/catalog';

const COOKIE = 'pandiones_cart';

type CartItemRow = { id: string; product_id: string; slug: string; name: string; image: string; color: string; size: string; quantity: number; price_kurus: number };

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function cartIdentity(create = false) {
  const store = await cookies();
  let token = store.get(COOKIE)?.value;
  let isNew = false;
  if (!token && create) { token = crypto.randomUUID() + crypto.randomUUID(); isNew = true; }
  return { token, tokenHash: token ? await hashToken(token) : null, isNew };
}

async function readCart(tokenHash: string | null) {
  if (!tokenHash) return { items: [], count: 0, subtotal: 0 };
  const result = await getDatabase().prepare(
    `SELECT ci.id, ci.product_id, p.slug, p.name, p.image, p.color, ci.size, ci.quantity, p.price_kurus
     FROM cart_items ci JOIN carts c ON c.id = ci.cart_id JOIN products p ON p.id = ci.product_id
     WHERE c.token_hash = ? AND p.status = 'published' ORDER BY ci.created_at DESC`
  ).bind(tokenHash).all<CartItemRow>();
  const items = result.results.map((item) => ({ id: item.id, productId: item.product_id, slug: item.slug, name: item.name, image: item.image, color: item.color, size: item.size, quantity: item.quantity, priceKurus: item.price_kurus, lineTotal: item.quantity * item.price_kurus }));
  return { items, count: items.reduce((sum, item) => sum + item.quantity, 0), subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0) };
}

export async function GET() {
  await ensureCatalogSchema();
  const { tokenHash } = await cartIdentity();
  return NextResponse.json(await readCart(tokenHash), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  await ensureCatalogSchema();
  const body = await request.json().catch(() => null) as { productId?: string; size?: string; quantity?: number } | null;
  const quantity = Number(body?.quantity ?? 1);
  if (!body?.productId || !body.size || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return NextResponse.json({ error: 'Ürün, beden veya adet geçersiz.' }, { status: 422 });
  const product = await getDatabase().prepare("SELECT id, sizes_json FROM products WHERE id = ? AND status = 'published' LIMIT 1").bind(body.productId).first<{ id: string; sizes_json: string }>();
  if (!product || !(JSON.parse(product.sizes_json) as string[]).includes(body.size)) return NextResponse.json({ error: 'Bu ürün veya beden satışa açık değil.' }, { status: 409 });
  const { token, tokenHash, isNew } = await cartIdentity(true);
  const now = new Date().toISOString();
  const cartId = crypto.randomUUID();
  await getDatabase().batch([
    getDatabase().prepare('INSERT OR IGNORE INTO carts (id, token_hash, created_at, updated_at) VALUES (?, ?, ?, ?)').bind(cartId, tokenHash, now, now),
    getDatabase().prepare(`INSERT INTO cart_items (id, cart_id, product_id, size, quantity, created_at, updated_at)
      VALUES (?, (SELECT id FROM carts WHERE token_hash = ?), ?, ?, ?, ?, ?)
      ON CONFLICT(cart_id, product_id, size) DO UPDATE SET quantity = MIN(10, cart_items.quantity + excluded.quantity), updated_at = excluded.updated_at`)
      .bind(crypto.randomUUID(), tokenHash, body.productId, body.size, quantity, now, now),
  ]);
  const response = NextResponse.json(await readCart(tokenHash), { status: 201 });
  if (isNew && token) response.cookies.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export async function PATCH(request: Request) {
  await ensureCatalogSchema();
  const body = await request.json().catch(() => null) as { id?: string; quantity?: number } | null;
  const quantity = Number(body?.quantity);
  if (!body?.id || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return NextResponse.json({ error: 'Geçersiz adet.' }, { status: 422 });
  const { tokenHash } = await cartIdentity();
  if (!tokenHash) return NextResponse.json({ error: 'Çanta bulunamadı.' }, { status: 404 });
  await getDatabase().prepare('UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ? AND cart_id = (SELECT id FROM carts WHERE token_hash = ?)').bind(quantity, new Date().toISOString(), body.id, tokenHash).run();
  return NextResponse.json(await readCart(tokenHash));
}

export async function DELETE(request: Request) {
  await ensureCatalogSchema();
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: 'Geçersiz ürün.' }, { status: 422 });
  const { tokenHash } = await cartIdentity();
  if (!tokenHash) return NextResponse.json({ error: 'Çanta bulunamadı.' }, { status: 404 });
  await getDatabase().prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = (SELECT id FROM carts WHERE token_hash = ?)').bind(body.id, tokenHash).run();
  return NextResponse.json(await readCart(tokenHash));
}

