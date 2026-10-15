import { prisma } from '../../../src/lib/prisma';
import { signSession } from '../../helpers/session';
import path from 'node:path';
import fs from 'node:fs';

export interface TestUserContext {
  user: { id: string; email: string; name: string | null; role: string };
  token: string;
  headers: Record<string, string>;
  cookieHeader: Record<string, string>;
  cleanup: () => Promise<void>;
}

/**
 * Creates an ephemeral test user in the test database and produces signed session credentials.
 */
export async function makeTestUser(role: 'ADMIN' | 'CUSTOMER'): Promise<TestUserContext> {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const email = `test-${role.toLowerCase()}-${nonce}@pandiones.test`;
  const user = await prisma.user.create({
    data: {
      email,
      name: `Test ${role} ${nonce}`,
      passwordHash: '$2a$10$wT0v/yZfXF/yS/fP5Bq7ueeXwD0.qA7K5vP4l8s5r/wK6.u7q7q0m',
      role,
    },
  });

  const token = await signSession({
    userId: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role,
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    Cookie: `pandiones_session=${token}`,
  };

  const cookieHeader = {
    Cookie: `pandiones_session=${token}`,
  };

  const cleanup = async () => {
    try {
      await prisma.auditLog.deleteMany({ where: { actorId: user.id } }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    } catch {
      // Ignore cleanup error in test tear-down
    }
  };

  return { user, token, headers, cookieHeader, cleanup };
}

/**
 * Creates an ephemeral product in the database for E2E tests, with default size variants.
 */
export async function makeTestProduct(overrides: Record<string, unknown> = {}) {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const slug = (overrides.slug as string) || `test-prod-${nonce}`;
  const price = (overrides.price as number) ?? 1250;
  const status = (overrides.status as string) || 'PUBLISHED';
  const name = (overrides.name as string) || `Test İpek Sütyen ${nonce}`;
  const color = (overrides.color as string) || 'Siyah';
  const category = (overrides.category as string) || 'sutyen';
  const image = (overrides.image as string) || '/assets/test-product.webp';

  const productData: any = {
    slug,
    name,
    price,
    color,
    category,
    image,
    status,
    description: (overrides.description as string) || 'Zarif dantel detaylı lüks sütyen',
    compareAtPrice: overrides.compareAtPrice as number | undefined,
    vatRate: (overrides.vatRate as number) ?? 10,
    ...overrides,
    variants: {
      create: (overrides.variants as any[]) || [
        { size: '75B', stock: 5 },
        { size: '80B', stock: 2 },
        { size: '85B', stock: 0 },
      ],
    },
  };

  let product: any;
  try {
    product = await prisma.product.create({
      data: productData,
      include: { variants: true },
    });
  } catch (err: any) {
    if (String(err?.message || '').includes('Unknown argument')) {
      const { noindex, excludeFromFeed, canonicalUrl, seoTitle, seoDescription, ...filtered } = productData;
      product = await prisma.product.create({
        data: filtered,
        include: { variants: true },
      });
    } else {
      throw err;
    }
  }

  const cleanup = async () => {
    try {
      await prisma.variant.deleteMany({ where: { productId: product.id } }).catch(() => {});
      await prisma.productMedia.deleteMany({ where: { productId: product.id } }).catch(() => {});
      await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
    } catch {
      // Ignore cleanup error
    }
  };

  return { product, cleanup };
}

/**
 * Creates an ephemeral category in the database.
 */
export async function makeTestCategory(overrides: Record<string, unknown> = {}) {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const slug = (overrides.slug as string) || `test-cat-${nonce}`;
  const name = (overrides.name as string) || `Test Kategori ${nonce}`;

  const category = await prisma.category.create({
    data: {
      slug,
      name,
      displayOrder: (overrides.displayOrder as number) ?? 999,
      isActive: (overrides.isActive as boolean) ?? true,
      description: (overrides.description as string) || 'Test kategori açıklaması',
      ...overrides,
    },
  });

  const cleanup = async () => {
    try {
      await prisma.category.delete({ where: { id: category.id } }).catch(() => {});
    } catch {
      // Ignore cleanup error
    }
  };

  return { category, cleanup };
}

/**
 * Temporarily wraps an execution block with overridden storeSettings and reverts afterwards.
 */
export async function withStoreSettings(
  overrides: Record<string, unknown>,
  fn: () => Promise<void>
): Promise<void> {
  const original = await prisma.storeSettings.findUnique({ where: { id: 'store' } });
  try {
    try {
      await prisma.storeSettings.upsert({
        where: { id: 'store' },
        update: overrides as any,
        create: {
          id: 'store',
          storeName: 'Pandiones',
          contactEmail: 'destek@pandiones.com',
          seoTitle: 'Pandiones',
          seoDescription: 'Lüks iç giyim',
          shippingFee: 0,
          lowStockThreshold: 3,
          ...overrides,
        } as any,
      });
      await fn();
    } catch (err: any) {
      if (String(err?.message || '').includes('Unknown argument')) {
        const knownKeys = [
          'storeName', 'contactEmail', 'contactPhone', 'whatsappNumber', 'instagramUrl',
          'tiktokUrl', 'pinterestUrl', 'shippingFee', 'freeShippingThreshold',
          'announcementEnabled', 'announcementText', 'announcementHref', 'maintenanceEnabled',
          'maintenanceMessage', 'seoTitle', 'seoDescription', 'lowStockThreshold',
          'senderName', 'senderPhone', 'senderAddress', 'senderCity', 'senderDistrict', 'defaultDesi'
        ];
        const filtered: any = {};
        for (const k of knownKeys) {
          if (k in overrides) filtered[k] = overrides[k];
        }
        if (Object.keys(filtered).length > 0) {
          await prisma.storeSettings.upsert({
            where: { id: 'store' },
            update: filtered,
            create: {
              id: 'store',
              storeName: 'Pandiones',
              contactEmail: 'destek@pandiones.com',
              seoTitle: 'Pandiones',
              seoDescription: 'Lüks iç giyim',
              shippingFee: 0,
              lowStockThreshold: 3,
              ...filtered,
            },
          });
        }
        await fn();
      } else {
        throw err;
      }
    }
  } finally {
    if (original) {
      await prisma.storeSettings.update({
        where: { id: 'store' },
        data: original,
      });
    } else {
      await prisma.storeSettings.deleteMany({ where: { id: 'store' } }).catch(() => {});
    }
  }
}

/**
 * Helper to dynamically load a Next.js route handler (GET, POST, PUT, DELETE, etc.).
 * Returns null if the route module does not exist on disk yet.
 */
export async function loadRouteHandler<T = any>(relativePath: string): Promise<T | null> {
  try {
    const fullPath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(fullPath) && !fs.existsSync(`${fullPath}.ts`) && !fs.existsSync(`${fullPath}.tsx`)) {
      return null;
    }
    // Dynamic import with variable prevents TypeScript from failing static resolution
    const mod = await import(`../../..${relativePath.replace(/\\/g, '/')}`);
    return mod as T;
  } catch {
    return null;
  }
}

/**
 * Parsed Google Merchant XML item for assertions.
 */
export interface ParsedMerchantItem {
  id?: string;
  title?: string;
  description?: string;
  link?: string;
  imageLink?: string;
  brand?: string;
  availability?: string;
  price?: string;
  salePrice?: string;
  itemGroupId?: string;
  size?: string;
  color?: string;
  shippingCountry?: string;
  shippingService?: string;
  shippingPrice?: string;
  rawXml: string;
}

/**
 * Parses Google Merchant XML and extracts all <item> elements into structured objects.
 */
export function parseMerchantFeedXml(xml: string): ParsedMerchantItem[] {
  const items: ParsedMerchantItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  const extractTag = (itemContent: string, tagName: string): string | undefined => {
    // Matches <g:tag>value</g:tag> or <tag>value</tag>
    const tagRegex = new RegExp(`<(?:g:)?${tagName}>([\\s\\S]*?)<\\/(?:g:)?${tagName}>`, 'i');
    const tagMatch = itemContent.match(tagRegex);
    return tagMatch ? tagMatch[1].trim() : undefined;
  };

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    items.push({
      id: extractTag(content, 'id'),
      title: extractTag(content, 'title'),
      description: extractTag(content, 'description'),
      link: extractTag(content, 'link'),
      imageLink: extractTag(content, 'image_link'),
      brand: extractTag(content, 'brand'),
      availability: extractTag(content, 'availability'),
      price: extractTag(content, 'price'),
      salePrice: extractTag(content, 'sale_price'),
      itemGroupId: extractTag(content, 'item_group_id'),
      size: extractTag(content, 'size'),
      color: extractTag(content, 'color'),
      shippingCountry: extractTag(content, 'country'),
      shippingService: extractTag(content, 'service'),
      shippingPrice: extractTag(content, 'price'),
      rawXml: content,
    });
  }

  return items;
}
