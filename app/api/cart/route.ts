import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ items: [], count: 0, subtotal: 0 });
}

export async function POST() {
  return NextResponse.json({ items: [], count: 0, subtotal: 0 });
}

export async function PATCH() {
  return NextResponse.json({ items: [], count: 0, subtotal: 0 });
}

export async function DELETE() {
  return NextResponse.json({ items: [], count: 0, subtotal: 0 });
}
