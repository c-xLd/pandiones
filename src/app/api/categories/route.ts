import { NextResponse } from 'next/server';
import { getCategoriesTree } from '@/lib/categories';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await getCategoriesTree(false); // active only
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching public categories:', error);
    return NextResponse.json({ categories: [] }, { status: 500 });
  }
}
