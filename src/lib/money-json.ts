import { kurusToTl, kurusToTlOrNull } from './money';

/**
 * JSON for the screens keeps the TL field names it always had (`price`, `totalAmount`, `currentBalance`…);
 * the database and server arithmetic are in kuruş (`priceKurus`, `totalKurus`…). These turn a row read from
 * the database into that JSON shape at the API boundary, so no screen has to know about kuruş. The kuruş
 * fields are left out of the output.
 */

type OrderItemRow = { priceKurus: number };
type OrderRow = { totalKurus: number; discountKurus: number; giftCardKurus: number; items?: OrderItemRow[] };

export function orderItemJson<T extends OrderItemRow>(item: T) {
  const { priceKurus, ...rest } = item;
  return { ...rest, price: kurusToTl(priceKurus) };
}

export function orderJson<T extends OrderRow>(order: T) {
  const { totalKurus, discountKurus, giftCardKurus, items, ...rest } = order;
  return {
    ...rest,
    totalAmount: kurusToTl(totalKurus),
    discountAmount: kurusToTl(discountKurus),
    giftCardAmount: kurusToTl(giftCardKurus),
    ...(items ? { items: items.map(orderItemJson) } : {}),
  } as Omit<T, keyof OrderRow> & { totalAmount: number; discountAmount: number; giftCardAmount: number } & (T extends { items: (infer I extends OrderItemRow)[] } ? { items: (Omit<I, 'priceKurus'> & { price: number })[] } : unknown);
}

type ProductRow = { priceKurus: number; compareAtPriceKurus?: number | null };

export function productJson<T extends ProductRow>(product: T) {
  const { priceKurus, compareAtPriceKurus, ...rest } = product;
  return { ...rest, price: kurusToTl(priceKurus), compareAtPrice: kurusToTlOrNull(compareAtPriceKurus) } as Omit<T, keyof ProductRow> & {
    price: number;
    compareAtPrice: number | null;
  };
}

type CouponRow = { discountType: string; discountPercent: number | null; discountKurus: number | null; minSpendKurus: number };

/** `discountValue` is a percent for PERCENTAGE coupons and TL for FIXED ones, as the coupon screen shows it. */
export function couponJson<T extends CouponRow>(coupon: T) {
  const { discountPercent, discountKurus, minSpendKurus, ...rest } = coupon;
  return {
    ...rest,
    discountValue: coupon.discountType === 'PERCENTAGE' ? (discountPercent ?? 0) : kurusToTl(discountKurus ?? 0),
    minSpend: kurusToTl(minSpendKurus),
  } as Omit<T, keyof CouponRow> & { discountType: string; discountValue: number; minSpend: number };
}

type GiftCardUsageRow = { amountKurus: number };
type GiftCardRow = { initialBalanceKurus: number; currentBalanceKurus: number; usages?: GiftCardUsageRow[] };

export function giftCardUsageJson<T extends GiftCardUsageRow>(usage: T) {
  const { amountKurus, ...rest } = usage;
  return { ...rest, amount: kurusToTl(amountKurus) };
}

export function giftCardJson<T extends GiftCardRow>(card: T) {
  const { initialBalanceKurus, currentBalanceKurus, usages, ...rest } = card;
  return {
    ...rest,
    initialBalance: kurusToTl(initialBalanceKurus),
    currentBalance: kurusToTl(currentBalanceKurus),
    ...(usages ? { usages: usages.map(giftCardUsageJson) } : {}),
  } as Omit<T, keyof GiftCardRow> & { initialBalance: number; currentBalance: number } & (T extends { usages: (infer U extends GiftCardUsageRow)[] } ? { usages: (Omit<U, 'amountKurus'> & { amount: number })[] } : unknown);
}

/** Kuruş column → the TL field name the screens have always read. */
const TL_FIELD: Record<string, string> = {
  priceKurus: 'price',
  compareAtPriceKurus: 'compareAtPrice',
  totalKurus: 'totalAmount',
  discountKurus: 'discountAmount',
  giftCardKurus: 'giftCardAmount',
  amountKurus: 'amount',
  initialBalanceKurus: 'initialBalance',
  currentBalanceKurus: 'currentBalance',
  minSpendKurus: 'minSpend',
};

/**
 * For responses that pass nested database rows straight through (an order with its lines, payments and
 * gift-card uses): every kuruş field at any depth becomes its TL field. Coupons go through couponJson
 * instead (their `discountKurus` is the coupon value, not an order discount).
 */
export function toTlJson<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => toTlJson(item)) as T;
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value as Record<string, unknown>)) {
    const tlKey = TL_FIELD[key];
    if (tlKey) out[tlKey] = typeof field === 'number' ? kurusToTl(field) : field;
    else out[key] = toTlJson(field);
  }
  return out as T;
}
