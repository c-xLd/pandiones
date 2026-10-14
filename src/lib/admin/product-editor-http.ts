import { NextResponse } from 'next/server';

const RESPONSES: Record<string, { status: number; message: string }> = {
  INVALID_PRODUCT: { status: 400, message: 'Ürün alanlarını kontrol edin.' },
  INVALID_MEDIA: { status: 400, message: 'Medya alanlarını ve poster seçimini kontrol edin.' },
  INVALID_PUBLISH: { status: 400, message: 'Ürünü yayınlamak için kapak, fiyat, renk ve stok alanlarını tamamlayın.' },
  INVALID_FILE_TYPE: { status: 400, message: 'Dosya türü desteklenmiyor veya içerikle eşleşmiyor.' },
  FILE_TOO_LARGE: { status: 400, message: 'Dosya boyutu izin verilen sınırı aşıyor.' },
  EMPTY_FILE: { status: 400, message: 'Boş dosya yüklenemez.' },
  NOT_FOUND: { status: 404, message: 'Ürün veya medya bulunamadı.' },
  COVER_REQUIRED: { status: 409, message: 'Yayınlanmış ürünün tek kapağı silinemez.' },
  COLOR_CONFLICT: { status: 409, message: 'Bu renk ailede zaten bulunuyor.' },
  CATEGORY_CONFLICT: { status: 409, message: 'Farklı kategoriler aynı renk ailesine bağlanamaz.' },
  STORAGE_UNAVAILABLE: { status: 503, message: 'Medya depolaması şu anda yapılandırılmamış.' },
  CLEANUP_FAILED: { status: 500, message: 'Medya kaydı silindi ancak depolamadaki dosya temizlenemedi; yönetici kontrolü gerekiyor.' },
  P2002: { status: 409, message: 'Aynı ürün veya kayıt zaten mevcut.' },
  INVALID_BARCODE: { status: 400, message: 'Barkod geçersiz: 13 haneli EAN-13 olmalı ve son hanesi (kontrol hanesi) tutmalı.' },
  INVALID_SKU: { status: 400, message: 'Stok kodu (SKU) 2–40 karakter olmalı; harf, rakam, nokta, tire, alt çizgi ve eğik çizgi kullanılabilir.' },
  INVALID_COMPARE_PRICE: { status: 400, message: 'Piyasa fiyatı satış fiyatından yüksek olmalı; değilse boş bırakın.' },
  INVALID_VAT: { status: 400, message: 'KDV oranı %1, %10 veya %20 olmalı.' },
  SUBCATEGORY_REQUIRED: { status: 400, message: 'Bu kategorinin alt kategorileri var; ürünü bir alt kategoriye yerleştirin.' },
  DUPLICATE_CODE: { status: 409, message: 'Bu stok kodu veya barkod başka bir bedende ya da üründe kullanılıyor.' },
  VIDEO_LIMIT: { status: 409, message: 'Bu rengin videosu var. Yenisini eklemek için önce mevcut videoyu silin.' },
  HAS_ORDERS: { status: 409, message: 'Bu ürün siparişlerde geçiyor; fatura ve iade kayıtları için silinemez. Mağazadan kaldırmak için taslağa alın.' },
  POSTER_IN_USE: { status: 409, message: 'Bu görsel videonun posteri. Önce videonun posterini değiştirin ya da videoyu silin.' },
};

export function adminProductErrorResponse(error: unknown): NextResponse {
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'INTERNAL_ERROR';
  const known = RESPONSES[code];
  if (!known) console.error('Admin product operation failed with an unexpected error.');
  return NextResponse.json(
    { success: false, code: known ? code : 'INTERNAL_ERROR', error: known?.message ?? 'İşlem tamamlanamadı.' },
    { status: known?.status ?? 500 },
  );
}

export function adminForbiddenResponse(): NextResponse {
  return NextResponse.json({ success: false, code: 'FORBIDDEN', error: 'Yetkisiz erişim.' }, { status: 403 });
}
