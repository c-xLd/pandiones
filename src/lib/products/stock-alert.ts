/** "Stok gelince haber ver" — input rules shared by the API route and the form.
 *  The email itself is sent later by dispatchStockAlerts (lib/admin/product-editor-service.ts)
 *  when an admin restocks that size; signing up only records the request. */

export type StockAlertInput = { productId: string; size: string; email: string };

export type StockAlertValidation =
  | { ok: true; value: StockAlertInput }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidAlertEmail(email: string): boolean {
  const value = email.trim();
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function validateStockAlertInput(body: unknown): StockAlertValidation {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Geçersiz istek.' };
  const { productId, size, email } = body as Record<string, unknown>;
  if (typeof productId !== 'string' || !productId.trim()) return { ok: false, error: 'Ürün bulunamadı.' };
  if (typeof size !== 'string' || !size.trim() || size.length > 16) return { ok: false, error: 'Lütfen bir beden seç.' };
  if (typeof email !== 'string' || !isValidAlertEmail(email)) {
    return { ok: false, error: 'Lütfen geçerli bir e-posta adresi yaz.' };
  }
  return { ok: true, value: { productId: productId.trim(), size: size.trim(), email: email.trim().toLowerCase() } };
}
