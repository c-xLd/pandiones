import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';
import { formatKurus, kurusToTl } from '@/lib/money';

export const GIFT_CARD_PRODUCT_ID = 'pandiones-gift-card';
export const GIFT_CARD_PRODUCT_SLUG = 'dijital-hediye-karti';

export interface GiftCardInput {
  /** Starting balance in kuruş. */
  initialBalanceKurus: number;
  theme: 'noir' | 'pearl' | 'rose' | string;
  recipientName: string;
  recipientEmail: string;
  senderName?: string | null;
  giftNote?: string | null;
  deliveryDate?: string | null;
  orderId?: string | null;
  isActive?: boolean;
}

export async function ensureGiftCardProduct(db: PrismaClient = prisma) {
  const existing = await db.product.findUnique({
    where: { id: GIFT_CARD_PRODUCT_ID },
    include: { variants: true },
  });

  if (existing) return existing;

  return db.product.upsert({
    where: { id: GIFT_CARD_PRODUCT_ID },
    create: {
      id: GIFT_CARD_PRODUCT_ID,
      slug: GIFT_CARD_PRODUCT_SLUG,
      name: 'Pandiones Dijital Hediye Kartı',
      priceKurus: 100000,
      color: 'Pandiones Noir',
      category: 'hediye-karti',
      image: '/assets/campaign-hero.jpeg',
      description: 'Pandiones dijital hediye kartı. Sevdiklerinize kendi zarif tercihlerini keşfetme özgürlüğü hediye edin.',
      status: 'PUBLISHED',
      featured: false,
      variants: {
        create: [
          { size: '1000 TL', stock: 9999 },
          { size: '2500 TL', stock: 9999 },
          { size: '5000 TL', stock: 9999 },
          { size: '10000 TL', stock: 9999 },
          { size: 'OZEL', stock: 9999 },
        ],
      },
    },
    update: {
      status: 'PUBLISHED',
    },
    include: { variants: true },
  });
}

/**
 * Generate a cryptographically secure, human-friendly gift card code
 * Format: PND-GC-XXXX-XXXX (e.g. PND-GC-8F42-99AB)
 */
export function generateGiftCardCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous characters (0, 1, O, I)
  const bytes = crypto.randomBytes(8);
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars[bytes[i] % chars.length];
    part2 += chars[bytes[i + 4] % chars.length];
  }
  return `PND-GC-${part1}-${part2}`;
}

export async function createGiftCard(input: GiftCardInput, db: PrismaClient = prisma) {
  let code = generateGiftCardCode();
  // Ensure uniqueness
  let exists = await db.giftCard.findUnique({ where: { code } });
  while (exists) {
    code = generateGiftCardCode();
    exists = await db.giftCard.findUnique({ where: { code } });
  }

  // Validity: 12 months (1 year) from creation date per brand policy
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  return db.giftCard.create({
    data: {
      code,
      initialBalanceKurus: input.initialBalanceKurus,
      currentBalanceKurus: input.initialBalanceKurus,
      currency: 'TRY',
      theme: input.theme || 'noir',
      recipientName: input.recipientName.trim(),
      recipientEmail: input.recipientEmail.trim().toLowerCase(),
      senderName: input.senderName?.trim() || null,
      giftNote: input.giftNote?.trim() || null,
      deliveryDate: input.deliveryDate || 'now',
      orderId: input.orderId || null,
      expiresAt,
      isActive: input.isActive !== undefined ? input.isActive : true,
    },
  });
}

export async function findGiftCardByCode(code: string, db: PrismaClient = prisma) {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return db.giftCard.findUnique({
    where: { code: normalized },
    include: { usages: true },
  });
}

export async function checkGiftCardBalance(code: string, db: PrismaClient = prisma) {
  const card = await findGiftCardByCode(code, db);
  if (!card) {
    return {
      valid: false,
      error: 'Hediye kartı bulunamadı. Lütfen kodu kontrol ediniz.',
    };
  }

  if (!card.isActive) {
    return {
      valid: false,
      error: 'Bu hediye kartı pasif durumdadır.',
    };
  }

  if (new Date() > card.expiresAt) {
    return {
      valid: false,
      error: 'Bu hediye kartının geçerlilik süresi dolmuştur.',
    };
  }

  return {
    valid: true,
    code: card.code,
    theme: card.theme,
    recipientName: card.recipientName,
    senderName: card.senderName,
    giftNote: card.giftNote,
    // TL for the balance screen.
    initialBalance: kurusToTl(card.initialBalanceKurus),
    currentBalance: kurusToTl(card.currentBalanceKurus),
    expiresAt: card.expiresAt,
  };
}

export async function redeemGiftCard(
  cardId: string,
  amountKurus: number,
  orderId: string,
  db: PrismaClient = prisma
) {
  return db.$transaction(async (tx) => {
    const card = await tx.giftCard.findUnique({ where: { id: cardId } });
    if (!card || !card.isActive || new Date() > card.expiresAt) {
      throw new Error('Hediye kartı geçersiz veya süresi dolmuş.');
    }

    if (card.currentBalanceKurus < amountKurus) {
      throw new Error(`Yetersiz hediye kartı bakiyesi. Kalan: ${formatKurus(card.currentBalanceKurus)}`);
    }

    const newBalance = Math.max(0, card.currentBalanceKurus - amountKurus);

    const updated = await tx.giftCard.update({
      where: { id: cardId },
      data: { currentBalanceKurus: newBalance },
    });

    await tx.giftCardUsage.create({
      data: {
        giftCardId: cardId,
        orderId,
        amountKurus,
      },
    });

    return updated;
  });
}
