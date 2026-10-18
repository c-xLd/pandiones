import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';
import {
  evaluateCartLine,
  MAX_QUOTE_LINES,
  type CartQuoteRequestLine,
} from '@/lib/cart/quote';
import { kurusToTl } from '@/lib/money';

export const dynamic = 'force-dynamic';

const parseLine = (raw: unknown): CartQuoteRequestLine | null => {
  if (!raw || typeof raw !== 'object') return null;
  const { id, slug, size, quantity, price } = raw as Record<string, unknown>;
  if (typeof size !== 'string' || !size.trim()) return null;
  if (typeof id !== 'string' && typeof slug !== 'string') return null;
  return {
    id: typeof id === 'string' ? id : undefined,
    slug: typeof slug === 'string' ? slug : undefined,
    size,
    quantity: Number(quantity) || 1,
    price: typeof price === 'number' ? price : undefined,
  };
};

/** Read-only price and stock check for the cart page. Checkout re-validates independently. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const rawItems = (body as { items?: unknown })?.items;
  if (!Array.isArray(rawItems) || rawItems.length > MAX_QUOTE_LINES) {
    return NextResponse.json({ error: 'Geçersiz çanta içeriği.' }, { status: 400 });
  }

  const lines = rawItems.map(parseLine);
  if (lines.some((line) => line === null)) {
    return NextResponse.json({ error: 'Geçersiz çanta satırı.' }, { status: 400 });
  }
  const validLines = lines as CartQuoteRequestLine[];

  try {
    const ids = validLines.map((l) => l.id).filter((v): v is string => Boolean(v));
    const slugs = validLines.map((l) => l.slug).filter((v): v is string => Boolean(v));
    const products = await prisma.product.findMany({
      where: { ...PUBLIC_PRODUCT_WHERE, OR: [{ id: { in: ids } }, { slug: { in: slugs } }] },
      select: { id: true, slug: true, name: true, priceKurus: true, variants: { select: { size: true, stock: true } } },
    });

    const lineQuotes = validLines.map((line) => {
      const product = products.find((p) => p.id === line.id || p.slug === line.slug) ?? null;
      // The cart quote speaks TL, like the cart in the browser.
      return evaluateCartLine(line, product ? { ...product, price: kurusToTl(product.priceKurus) } : null);
    });

    return NextResponse.json({ lines: lineQuotes });
  } catch (error) {
    console.error('Cart validation failed:', error);
    return NextResponse.json({ error: 'Fiyat ve stok doğrulanamadı.' }, { status: 500 });
  }
}
