import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const CART_COOKIE_NAME = 'pandiones_cart_session';

async function getOrCreateSessionId(): Promise<{ sessionId: string; setCookie: boolean }> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CART_COOKIE_NAME)?.value;
  if (existing) {
    return { sessionId: existing, setCookie: false };
  }
  const newSessionId = crypto.randomUUID();
  return { sessionId: newSessionId, setCookie: true };
}

export async function GET() {
  const { sessionId } = await getOrCreateSessionId();

  const { data: items, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      product_id,
      size,
      quantity,
      products (
        id,
        slug,
        name,
        image,
        color,
        price_kurus
      )
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json({ items: [], count: 0, subtotal: 0 });
  }

  const formattedItems = (items || [])
    .filter((item) => item.products)
    .map((item) => {
      const product = item.products as any;
      const priceKurus = product.price_kurus || 0;
      const lineTotal = priceKurus * item.quantity;
      return {
        id: item.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        color: product.color || 'Standart',
        size: item.size,
        quantity: item.quantity,
        priceKurus,
        lineTotal,
      };
    });

  const count = formattedItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = formattedItems.reduce((acc, item) => acc + item.lineTotal, 0);

  return NextResponse.json({ items: formattedItems, count, subtotal });
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, setCookie } = await getOrCreateSessionId();
    const body = await request.json();
    const { productId, size = 'M', quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if item already exists in cart for this session & size
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('session_id', sessionId)
      .eq('product_id', productId)
      .eq('size', size)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('cart_items')
        .update({
          quantity: existing.quantity + Number(quantity),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('cart_items').insert({
        session_id: sessionId,
        product_id: productId,
        size,
        quantity: Number(quantity),
      });
    }

    const response = await GET();
    if (setCookie) {
      response.cookies.set(CART_COOKIE_NAME, sessionId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }
    return response;
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { sessionId } = await getOrCreateSessionId();
    const body = await request.json();
    const { itemId, quantity, size } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof quantity === 'number') {
      if (quantity <= 0) {
        // Delete item if quantity is zero or less
        await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId)
          .eq('session_id', sessionId);
        return GET();
      }
      updateData.quantity = quantity;
    }
    if (size) {
      updateData.size = size;
    }

    await supabase
      .from('cart_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('session_id', sessionId);

    return GET();
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await getOrCreateSessionId();
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');

    if (itemId) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('session_id', sessionId);
    } else {
      // Clear entire cart
      await supabase
        .from('cart_items')
        .delete()
        .eq('session_id', sessionId);
    }

    return GET();
  } catch (error) {
    console.error('Error deleting from cart:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
