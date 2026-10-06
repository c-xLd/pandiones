import { NextResponse } from 'next/server';
import { ShipmentError } from './service';

/** ShipmentError → its status and message; anything else → 500 without internals. */
export function shipmentErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ShipmentError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(`${fallback}:`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export const forbidden = () => NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
