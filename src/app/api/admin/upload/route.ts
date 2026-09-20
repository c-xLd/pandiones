import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { adminForbiddenResponse } from '@/lib/admin/product-editor-http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') return adminForbiddenResponse();
    return NextResponse.json({
      success: false,
      code: 'PRODUCT_BOUND_UPLOAD_REQUIRED',
      error: 'Önce taslak ürün oluşturun, ardından ürüne bağlı medya alanından yükleyin.',
    }, { status: 410 });
  } catch (error) {
    console.error('Legacy upload endpoint failed.');
    return NextResponse.json({ success: false, code: 'INTERNAL_ERROR', error: 'Yükleme tamamlanamadı.' }, { status: 500 });
  }
}
