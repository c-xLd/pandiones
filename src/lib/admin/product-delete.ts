import { Prisma, type PrismaClient } from '@prisma/client';
import type { UserSession } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { isManagedMediaKey, type MediaStorage } from '@/lib/media/storage';

type Actor = Pick<UserSession, 'userId' | 'email'>;

export class ProductDeleteError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'HAS_ORDERS') {
    super(code);
  }
}

export type DeleteProductResult = {
  name: string;
  color: string;
  /** Uploaded files whose removal from storage failed; the product itself is gone. */
  cleanupFailed: number;
};

/**
 * Permanently removes a product that has never been ordered: its sizes, media records, wishlist entries and
 * stock requests go with it (schema cascades), an emptied colour family is removed, and the uploaded files are
 * deleted from storage afterwards. A product that appears on any order is refused (HAS_ORDERS): order lines
 * point at it for invoices and returns, so it can only be taken off the store (draft). The check and the
 * delete run in one transaction; an order placed in between is still caught by the foreign key.
 */
export async function deleteProduct(db: PrismaClient, storage: MediaStorage | null, actor: Actor, id: string): Promise<DeleteProductResult> {
  let removed: { name: string; color: string; keys: string[] };
  try {
    removed = await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
        select: { id: true, name: true, color: true, familyId: true, media: { select: { storageKey: true } }, _count: { select: { variants: true } } },
      });
      if (!product) throw new ProductDeleteError('NOT_FOUND');
      if ((await tx.orderItem.count({ where: { productId: id } })) > 0) throw new ProductDeleteError('HAS_ORDERS');

      await tx.product.delete({ where: { id } });
      if (product.familyId && (await tx.product.count({ where: { familyId: product.familyId } })) === 0) {
        await tx.productFamily.delete({ where: { id: product.familyId } });
      }
      await recordAudit(tx, actor, {
        action: 'product.delete',
        entity: 'product',
        entityId: id,
        summary: `${product.name} (${product.color}) kalıcı olarak silindi; ${product._count.variants} beden, ${product.media.length} medya`,
      });
      return { name: product.name, color: product.color, keys: product.media.map((item) => item.storageKey) };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new ProductDeleteError('HAS_ORDERS');
    throw error;
  }

  let cleanupFailed = 0;
  const managedKeys = removed.keys.filter(isManagedMediaKey);
  await Promise.all(
    managedKeys.map(async (key) => {
      try {
        if (!storage) throw new Error('storage unavailable');
        await storage.delete(key);
      } catch (error) {
        cleanupFailed += 1;
        console.error('Product deleted but a media file could not be removed:', { key, error: error instanceof Error ? error.message : error });
      }
    })
  );
  return { name: removed.name, color: removed.color, cleanupFailed };
}
