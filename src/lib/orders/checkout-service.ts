import crypto from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { PUBLIC_PRODUCT_WHERE } from '@/lib/products/public-catalog';
import {
  ensureGiftCardProduct,
  generateGiftCardCode,
  GIFT_CARD_PRODUCT_ID,
  GIFT_CARD_PRODUCT_SLUG,
} from '@/lib/gift-cards/gift-card-service';
import { giftCardThemeName, validateGiftCardPurchase } from '@/lib/gift-cards/purchase';
import { formatKurus, percentOfKurus, tlToKurus } from '@/lib/money';

/**
 * Order placement with reservations. Everything that limits an order — variant stock, a coupon's uses,
 * a gift card's balance — is claimed with a guarded UPDATE inside the transaction that creates the order,
 * so two requests can never both take the last unit / the last use / the same kuruş. All amounts are whole
 * kuruş (lib/money.ts). A pending order that
 * is not paid releases its claims (releaseOrder); the payment callback only moves pending → paid.
 */

export const CART_LIMITS = {
  lines: 30,
  quantityPerLine: 10,
  giftCardsPerOrder: 5,
  bodyBytes: 32 * 1024,
} as const;

/** Minutes a pending (unpaid) order keeps its reservations before the expiry job releases them. */
export const PENDING_ORDER_TTL_MINUTES = 45; // longer than the iyzico checkout-form token (30 min)

export class CheckoutError extends Error {
  constructor(message: string, readonly status = 400, readonly field?: string) {
    super(message);
  }
}


const ORDER_NO_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32, no I L O U
/** PAN- + 10 random base32 characters (≈ 50 bits): not guessable, not sequential. */
export function generateOrderNumber() {
  let out = '';
  for (let i = 0; i < 10; i += 1) out += ORDER_NO_ALPHABET[crypto.randomInt(ORDER_NO_ALPHABET.length)];
  return `PAN-${out}`;
}

export type CartLineInput = Record<string, unknown>;

export type ResolvedLine = {
  productId: string;
  variantId: string | null;
  productName: string;
  size: string;
  quantity: number;
  /** Unit price in kuruş, from the database (gift cards: the chosen denomination). */
  priceKurus: number;
  /** VAT rate (%) included in the price, copied onto the order line; null for gift cards (not a sale of goods). */
  vatRate: number | null;
  category: string;
  giftCard?: {
    theme: string;
    recipientName: string;
    recipientEmail: string;
    senderName: string | null;
    giftNote: string | null;
  };
};

const str = (value: unknown) => (typeof value === 'string' ? value : '');

function isGiftCardLine(item: CartLineInput) {
  const slug = str(item.slug);
  return item.id === GIFT_CARD_PRODUCT_ID || slug === GIFT_CARD_PRODUCT_SLUG || item.category === 'hediye-karti' || slug.startsWith('dijital-hediye-karti');
}

function lineQuantity(item: CartLineInput) {
  const quantity = Number(item.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1) throw new CheckoutError('Ürün adedi geçersiz.');
  if (quantity > CART_LIMITS.quantityPerLine) throw new CheckoutError(`Bir üründen en fazla ${CART_LIMITS.quantityPerLine} adet alınabilir.`);
  return quantity;
}

/**
 * Turns the client cart into priced lines from the database. Client prices are ignored except the
 * gift-card amount, which is validated against the allowed denominations. Lines for the same variant
 * are merged, so stock is checked against the real total.
 */
export async function resolveCart(db: PrismaClient, cart: unknown, senderFallback: string): Promise<ResolvedLine[]> {
  if (!Array.isArray(cart) || cart.length === 0) throw new CheckoutError('Sepetiniz boş.');
  if (cart.length > CART_LIMITS.lines) throw new CheckoutError(`Sepette en fazla ${CART_LIMITS.lines} satır olabilir.`);

  const lines: ResolvedLine[] = [];
  const byVariant = new Map<string, ResolvedLine>();
  let giftCardCount = 0;
  let categoryNames: Map<string, string> | null = null;
  const categoryName = async (slug: string) => {
    categoryNames ??= new Map((await db.category.findMany({ where: { parentId: null }, select: { slug: true, name: true } })).map((row) => [row.slug, row.name]));
    return categoryNames.get(slug) ?? slug;
  };

  for (const raw of cart) {
    if (!raw || typeof raw !== 'object') throw new CheckoutError('Sepet içeriği geçersiz.');
    const item = raw as CartLineInput;
    const quantity = lineQuantity(item);

    if (isGiftCardLine(item)) {
      giftCardCount += quantity;
      if (giftCardCount > CART_LIMITS.giftCardsPerOrder) throw new CheckoutError(`Bir siparişte en fazla ${CART_LIMITS.giftCardsPerOrder} hediye kartı alınabilir.`);
      const purchase = {
        amount: Number(item.price),
        theme: str(item.giftCardTheme),
        recipientName: str(item.recipientName),
        recipientEmail: str(item.recipientEmail),
        senderName: str(item.senderName),
        giftNote: str(item.giftNote),
      };
      const problem = Object.values(validateGiftCardPurchase(purchase))[0];
      if (problem) throw new CheckoutError(`Hediye kartı: ${problem}`);
      await ensureGiftCardProduct(db);
      lines.push({
        productId: GIFT_CARD_PRODUCT_ID,
        variantId: null,
        productName: `Pandiones Dijital Hediye Kartı (${giftCardThemeName(purchase.theme)})`,
        size: `${purchase.amount} TL`,
        quantity,
        priceKurus: tlToKurus(purchase.amount),
        vatRate: null,
        category: 'Hediye Kartı',
        giftCard: {
          theme: purchase.theme,
          recipientName: purchase.recipientName.trim(),
          recipientEmail: purchase.recipientEmail.trim().toLowerCase(),
          senderName: purchase.senderName.trim() || senderFallback,
          giftNote: purchase.giftNote.trim() || null,
        },
      });
      continue;
    }

    const size = str(item.size).trim().toUpperCase();
    if (!size) throw new CheckoutError('Lütfen sepetteki tüm ürünler için geçerli bir beden seçiniz.');
    const ref = str(item.id) || str(item.slug);
    if (!ref || ref.length > 100) throw new CheckoutError('Sepetteki bir ürün tanınmadı.');

    const product = await db.product.findFirst({
      where: { ...PUBLIC_PRODUCT_WHERE, OR: [{ id: ref }, { slug: str(item.slug) || ref }] },
      include: { variants: true },
    });
    if (!product) throw new CheckoutError(`"${str(item.name).slice(0, 80) || 'Seçilen ürün'}" artık satışta değil.`);
    const variant = product.variants.find((v) => v.size.toUpperCase() === size);
    if (!variant) throw new CheckoutError(`"${product.name}" için "${size}" bedeni mevcut değil.`);

    const merged = byVariant.get(variant.id);
    if (merged) {
      merged.quantity += quantity;
      if (merged.quantity > CART_LIMITS.quantityPerLine) throw new CheckoutError(`Bir üründen en fazla ${CART_LIMITS.quantityPerLine} adet alınabilir.`);
      continue;
    }
    const line: ResolvedLine = {
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      size: variant.size,
      quantity,
      priceKurus: product.priceKurus,
      vatRate: product.vatRate,
      category: await categoryName(product.category),
    };
    byVariant.set(variant.id, line);
    lines.push(line);
  }

  // Early, friendly stock message; the binding check is the guarded decrement in placeOrder.
  for (const line of byVariant.values()) {
    const variant = await db.variant.findUnique({ where: { id: line.variantId as string }, select: { stock: true } });
    if (!variant || variant.stock < line.quantity) {
      throw new CheckoutError(`"${line.productName} (${line.size})" için yeterli stok yok${variant ? ` (kalan: ${variant.stock})` : ''}.`, 409);
    }
  }
  return lines;
}

/** `amountKurus`: what the code takes off the order, in kuruş. */
export type DiscountPlan =
  | { kind: 'none'; amountKurus: 0 }
  | { kind: 'coupon'; amountKurus: number; couponId: string; code: string }
  | { kind: 'giftCard'; amountKurus: number; giftCardId: string; code: string };

/**
 * Prices a code against the cart. Coupons and gift-card balance never apply to gift-card lines
 * (otherwise a discount or a spent card turns into fresh, clean balance).
 */
export async function planDiscount(db: PrismaClient, rawCode: unknown, lines: ResolvedLine[], email: string, now = new Date()): Promise<DiscountPlan> {
  const code = str(rawCode).trim().toUpperCase();
  if (!code) return { kind: 'none', amountKurus: 0 };
  if (code.length > 40) throw new CheckoutError('Kod geçersiz.', 400, 'couponCode');

  const eligible = lines.filter((l) => !l.giftCard).reduce((sum, l) => sum + l.priceKurus * l.quantity, 0);
  const coupon = await db.coupon.findUnique({ where: { code } });

  if (coupon && coupon.isActive) {
    if (coupon.startsAt && now < coupon.startsAt) throw new CheckoutError('Bu kupon henüz geçerli değil.', 400, 'couponCode');
    if (coupon.expiresAt && now > coupon.expiresAt) throw new CheckoutError('Bu kuponun süresi dolmuş.', 400, 'couponCode');
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new CheckoutError('Bu kuponun kullanım limiti dolmuş.', 400, 'couponCode');
    if (eligible <= 0) throw new CheckoutError('Kuponlar hediye kartı alımında kullanılamaz.', 400, 'couponCode');
    if (coupon.minSpendKurus && eligible < coupon.minSpendKurus) {
      const min = formatKurus(coupon.minSpendKurus);
      throw new CheckoutError(`Bu kupon yalnız ${min} ve üzeri ürün tutarında geçerlidir.`, 400, 'couponCode');
    }
    if (coupon.perEmailLimit) {
      const used = await db.couponRedemption.count({ where: { couponId: coupon.id, email } });
      if (used >= coupon.perEmailLimit) throw new CheckoutError('Bu kuponu kullanım hakkınız doldu.', 400, 'couponCode');
    }
    const percent = Math.min(Math.max(coupon.discountPercent ?? 0, 0), 90);
    const amountKurus = coupon.discountType === 'PERCENTAGE' ? percentOfKurus(eligible, percent) : Math.min(Math.max(coupon.discountKurus ?? 0, 0), eligible);
    return { kind: 'coupon', amountKurus, couponId: coupon.id, code: coupon.code };
  }

  const card = await db.giftCard.findUnique({ where: { code } });
  if (!card) throw new CheckoutError('Girilen kupon veya hediye kartı kodu geçersiz.', 400, 'couponCode');
  if (!card.isActive) throw new CheckoutError('Bu hediye kartı kullanım dışı.', 400, 'couponCode');
  if (now > card.expiresAt) throw new CheckoutError('Bu hediye kartının süresi dolmuş.', 400, 'couponCode');
  if (card.currentBalanceKurus <= 0) throw new CheckoutError('Bu hediye kartının bakiyesi kalmamış.', 400, 'couponCode');
  if (eligible <= 0) throw new CheckoutError('Hediye kartı bakiyesi yeni hediye kartı alımında kullanılamaz.', 400, 'couponCode');
  return { kind: 'giftCard', amountKurus: Math.min(card.currentBalanceKurus, eligible), giftCardId: card.id, code: card.code };
}

export type OrderContact = {
  userId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingNotes: string;
};

type Tx = Prisma.TransactionClient;

async function createGiftCards(tx: Tx, orderId: string, lines: ResolvedLine[], fallbackEmail: string, active: boolean) {
  const created = [];
  for (const line of lines) {
    if (!line.giftCard) continue;
    for (let i = 0; i < line.quantity; i += 1) {
      let code = generateGiftCardCode();
      while (await tx.giftCard.findUnique({ where: { code }, select: { id: true } })) code = generateGiftCardCode();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 12);
      created.push(
        await tx.giftCard.create({
          data: {
            code,
            initialBalanceKurus: line.priceKurus,
            currentBalanceKurus: line.priceKurus,
            currency: 'TRY',
            theme: line.giftCard.theme || 'noir',
            recipientName: line.giftCard.recipientName || 'Değerli Misafirimiz',
            recipientEmail: line.giftCard.recipientEmail || fallbackEmail,
            senderName: line.giftCard.senderName,
            giftNote: line.giftCard.giftNote,
            deliveryDate: 'now',
            orderId,
            isActive: active, // purchased cards work only once the order is paid
            expiresAt,
          },
        }),
      );
    }
  }
  return created;
}

/**
 * Creates the order and claims stock, coupon use and gift-card balance in one transaction.
 * Any claim that cannot be made (sold out meanwhile, last coupon use taken, balance spent) aborts
 * the whole order with a clear message. A 0 TL order is paid on the spot.
 */
export async function placeOrder(
  db: PrismaClient,
  input: { contact: OrderContact; lines: ResolvedLine[]; discount: DiscountPlan; idempotencyKey: string | null },
) {
  const { contact, lines, discount } = input;
  const rawTotalKurus = lines.reduce((sum, l) => sum + l.priceKurus * l.quantity, 0);
  const totalKurus = Math.max(0, rawTotalKurus - discount.amountKurus);
  const paidNow = totalKurus === 0;
  const now = new Date();

  return db.$transaction(async (tx) => {
    for (const line of lines) {
      if (!line.variantId) continue;
      const claimed = await tx.variant.updateMany({
        where: { id: line.variantId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (claimed.count !== 1) throw new CheckoutError(`"${line.productName} (${line.size})" az önce tükendi.`, 409);
    }

    if (discount.kind === 'coupon') {
      const coupon = await tx.coupon.findUniqueOrThrow({ where: { id: discount.couponId }, select: { maxUses: true } });
      const claimed = await tx.coupon.updateMany({
        where: { id: discount.couponId, isActive: true, ...(coupon.maxUses ? { usedCount: { lt: coupon.maxUses } } : {}) },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new CheckoutError('Bu kuponun kullanım limiti az önce doldu.', 409, 'couponCode');
    }

    if (discount.kind === 'giftCard') {
      const claimed = await tx.giftCard.updateMany({
        where: { id: discount.giftCardId, isActive: true, expiresAt: { gt: now }, currentBalanceKurus: { gte: discount.amountKurus } },
        data: { currentBalanceKurus: { decrement: discount.amountKurus } },
      });
      if (claimed.count !== 1) throw new CheckoutError('Hediye kartı bakiyesi değişti; lütfen kodu yeniden uygulayın.', 409, 'couponCode');
    }

    let orderNumber = generateOrderNumber();
    while (await tx.order.findUnique({ where: { orderNumber }, select: { id: true } })) orderNumber = generateOrderNumber();

    const order = await tx.order.create({
      data: {
        orderNumber,
        idempotencyKey: input.idempotencyKey,
        userId: contact.userId,
        customerName: contact.customerName,
        customerEmail: contact.customerEmail,
        customerPhone: contact.customerPhone,
        shippingAddress: contact.shippingAddress,
        shippingCity: contact.shippingCity,
        shippingDistrict: contact.shippingDistrict,
        shippingNotes: contact.shippingNotes,
        couponCode: discount.kind === 'coupon' ? discount.code : null,
        discountKurus: discount.amountKurus,
        giftCardCode: discount.kind === 'giftCard' ? discount.code : null,
        giftCardKurus: discount.kind === 'giftCard' ? discount.amountKurus : 0,
        totalKurus,
        status: paidNow ? 'ODENDI' : 'ODEME_BEKLENIYOR',
        paymentProvider: paidNow ? (discount.kind === 'giftCard' ? 'GIFT_CARD' : 'COUPON') : 'IYZICO',
        paymentStatus: paidNow ? 'SUCCESS' : 'PENDING',
        paidAt: paidNow ? now : null,
        items: {
          create: lines.map((l) => ({ productId: l.productId, productName: l.productName, size: l.size, quantity: l.quantity, priceKurus: l.priceKurus, vatRate: l.vatRate })),
        },
      },
    });

    if (discount.kind === 'coupon') {
      await tx.couponRedemption.create({ data: { couponId: discount.couponId, email: contact.customerEmail, orderId: order.id } });
    }
    if (discount.kind === 'giftCard') {
      await tx.giftCardUsage.create({ data: { giftCardId: discount.giftCardId, orderId: order.id, amountKurus: discount.amountKurus } });
    }

    const giftCards = await createGiftCards(tx, order.id, lines, contact.customerEmail, paidNow);
    return { order, rawTotalKurus, totalKurus, paidNow, giftCards };
  });
}

/**
 * Gives back everything a pending order claimed (stock, coupon use, gift-card balance) and removes the
 * gift cards it would have bought. Only acts on an order that is still pending, so it is safe to call
 * from the payment-failure branch and from the expiry job at the same time.
 */
export async function releaseOrder(db: PrismaClient | Tx, orderId: string, reason: 'FAILURE' | 'EXPIRED', errorMessage?: string) {
  const run = async (tx: Tx) => {
    const moved = await tx.order.updateMany({
      where: { id: orderId, status: 'ODEME_BEKLENIYOR' },
      data: { status: 'ODEME_BASARISIZ', paymentStatus: reason },
    });
    if (moved.count !== 1) return false;

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, giftCardUsages: true, couponRedemption: true },
    });
    for (const item of order.items) {
      if (item.productId === GIFT_CARD_PRODUCT_ID) continue; // gift-card lines never claimed stock
      await tx.variant.updateMany({ where: { productId: item.productId, size: item.size }, data: { stock: { increment: item.quantity } } });
    }
    for (const usage of order.giftCardUsages) {
      await tx.giftCard.update({ where: { id: usage.giftCardId }, data: { currentBalanceKurus: { increment: usage.amountKurus } } });
    }
    await tx.giftCardUsage.deleteMany({ where: { orderId } });
    if (order.couponRedemption) {
      await tx.coupon.updateMany({ where: { id: order.couponRedemption.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
      await tx.couponRedemption.delete({ where: { id: order.couponRedemption.id } });
    }
    await tx.giftCard.deleteMany({ where: { orderId, isActive: false } });
    await tx.paymentTransaction.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'FAILURE', errorMessage: errorMessage ?? (reason === 'EXPIRED' ? 'Ödeme süresi doldu.' : null) } });
    return true;
  };
  return '$transaction' in db ? (db as PrismaClient).$transaction(run) : run(db as Tx);
}

/** Releases every pending order older than the TTL. Returns how many were released. */
export async function expirePendingOrders(db: PrismaClient, now = new Date(), limit = 200) {
  const cutoff = new Date(now.getTime() - PENDING_ORDER_TTL_MINUTES * 60 * 1000);
  const stale = await db.order.findMany({
    where: { status: 'ODEME_BEKLENIYOR', createdAt: { lt: cutoff } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
    take: limit,
  });
  let released = 0;
  for (const { id } of stale) if (await releaseOrder(db, id, 'EXPIRED')) released += 1;
  return released;
}
