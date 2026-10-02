/** Server-side rules for an admin-created coupon. Pure, so the admin form can show the same messages. */

export type CouponInput = {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minSpend: number;
  maxUses: number | null;
  perEmailLimit: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
};

const num = (value: unknown) => (value === '' || value === null || value === undefined ? null : Number(value));
const date = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export function validateCouponInput(body: Record<string, unknown>): { ok: true; value: CouponInput } | { ok: false; error: string } {
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!/^[A-Z0-9-]{3,30}$/.test(code)) return { ok: false, error: 'Kupon kodu 3–30 karakter; yalnız harf, rakam ve tire.' };

  const discountType = body.discountType === 'FIXED' ? 'FIXED' : body.discountType === 'PERCENTAGE' || body.discountType === undefined ? 'PERCENTAGE' : null;
  if (!discountType) return { ok: false, error: 'İndirim türü geçersiz.' };

  const discountValue = num(body.discountValue);
  if (discountValue === null || !Number.isFinite(discountValue)) return { ok: false, error: 'İndirim değerini girin.' };
  if (discountType === 'PERCENTAGE' && (!Number.isInteger(discountValue) || discountValue < 1 || discountValue > 90)) {
    return { ok: false, error: 'Yüzde indirim 1 ile 90 arasında tam sayı olmalı.' };
  }
  if (discountType === 'FIXED' && (discountValue <= 0 || discountValue > 100_000)) return { ok: false, error: 'Tutar indirimi 0 ile 100.000 ₺ arasında olmalı.' };

  const minSpend = num(body.minSpend) ?? 0;
  if (!Number.isFinite(minSpend) || minSpend < 0 || minSpend > 1_000_000) return { ok: false, error: 'En az sepet tutarı geçersiz.' };

  const maxUses = num(body.maxUses);
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 1_000_000)) return { ok: false, error: 'Kullanım kotası 1 veya üzeri tam sayı olmalı (boş = sınırsız).' };

  const perEmailLimit = num(body.perEmailLimit);
  if (perEmailLimit !== null && (!Number.isInteger(perEmailLimit) || perEmailLimit < 1 || perEmailLimit > 100)) return { ok: false, error: 'Kişi başı limit 1–100 arasında olmalı (boş = sınırsız).' };

  const startsAt = date(body.startsAt);
  const expiresAt = date(body.expiresAt);
  if (startsAt === undefined || expiresAt === undefined) return { ok: false, error: 'Tarih geçersiz.' };
  if (startsAt && expiresAt && expiresAt <= startsAt) return { ok: false, error: 'Bitiş tarihi başlangıçtan sonra olmalı.' };

  return { ok: true, value: { code, discountType, discountValue, minSpend, maxUses, perEmailLimit, startsAt, expiresAt } };
}
