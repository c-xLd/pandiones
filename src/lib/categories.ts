import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { slugifyCategory } from '@/lib/category-utils';
export { slugifyCategory };

export interface CategoryRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  displayOrder: number;
  image: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  productCount?: number;
  children?: CategoryRecord[];
  parent?: CategoryRecord | null;
}

export async function getAllCategories(includeInactive = false): Promise<CategoryRecord[]> {
  const query = includeInactive
    ? `SELECT * FROM "Category" ORDER BY "displayOrder" ASC, "createdAt" ASC`
    : `SELECT * FROM "Category" WHERE "isActive" = 1 ORDER BY "displayOrder" ASC, "createdAt" ASC`;

  const rows = await prisma.$queryRawUnsafe<any[]>(query);
  return rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    description: r.description ? String(r.description) : null,
    parentId: r.parentId ? String(r.parentId) : null,
    displayOrder: Number(r.displayOrder) || 0,
    image: r.image ? String(r.image) : null,
    isActive: Boolean(r.isActive === 1 || r.isActive === true),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function getCategoriesTree(includeInactive = false): Promise<CategoryRecord[]> {
  const all = await getAllCategories(includeInactive);

  // Get product counts
  const rootCounts = await prisma.$queryRawUnsafe<{ category: string; count: number }[]>(`
    SELECT "category", COUNT(*) as "count" FROM "Product" GROUP BY "category"
  `);
  const rootCountMap = new Map<string, number>();
  for (const r of rootCounts) {
    rootCountMap.set(r.category, Number(r.count));
  }

  const subCounts = await prisma.$queryRawUnsafe<{ subcategory: string; count: number }[]>(`
    SELECT "subcategory", COUNT(*) as "count" FROM "Product" WHERE "subcategory" IS NOT NULL GROUP BY "subcategory"
  `);
  const subCountMap = new Map<string, number>();
  for (const s of subCounts) {
    if (s.subcategory) subCountMap.set(s.subcategory, Number(s.count));
  }

  const categoryMap = new Map<string, CategoryRecord>();
  all.forEach((cat) => {
    const isSub = Boolean(cat.parentId);
    const count = isSub
      ? subCountMap.get(cat.slug) || 0
      : rootCountMap.get(cat.slug) || 0;

    categoryMap.set(cat.id, {
      ...cat,
      productCount: count,
      children: [],
    });
  });

  const roots: CategoryRecord[] = [];

  categoryMap.forEach((cat) => {
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      const parent = categoryMap.get(cat.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(cat);
      cat.parent = { ...parent, children: undefined };
    } else {
      roots.push(cat);
    }
  });

  roots.sort((a, b) => a.displayOrder - b.displayOrder);
  roots.forEach((root) => {
    if (root.children && root.children.length > 0) {
      root.children.sort((a, b) => a.displayOrder - b.displayOrder);
    }
  });

  return roots;
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRecord | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Category" WHERE LOWER("slug") = LOWER(?) LIMIT 1`,
    slug
  );
  if (!rows || rows.length === 0) return null;

  const r = rows[0];
  const cat: CategoryRecord = {
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    description: r.description ? String(r.description) : null,
    parentId: r.parentId ? String(r.parentId) : null,
    displayOrder: Number(r.displayOrder) || 0,
    image: r.image ? String(r.image) : null,
    isActive: Boolean(r.isActive === 1 || r.isActive === true),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };

  if (!cat.parentId) {
    const childRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Category" WHERE "parentId" = ? AND "isActive" = 1 ORDER BY "displayOrder" ASC`,
      cat.id
    );
    cat.children = childRows.map((c) => ({
      id: String(c.id),
      slug: String(c.slug),
      name: String(c.name),
      description: c.description ? String(c.description) : null,
      parentId: String(c.parentId),
      displayOrder: Number(c.displayOrder) || 0,
      image: c.image ? String(c.image) : null,
      isActive: Boolean(c.isActive === 1 || c.isActive === true),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  return cat;
}

export async function createCategory(input: {
  name: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  displayOrder?: number;
  image?: string | null;
  isActive?: boolean;
}): Promise<CategoryRecord> {
  const name = input.name.trim();
  if (!name) throw new Error('Kategori adı zorunludur.');

  let slug = slugifyCategory(input.slug?.trim() || name);
  if (!slug) throw new Error('Geçerli bir kategori bağlantısı (slug) oluşturulamadı.');

  // Ensure unique slug
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id" FROM "Category" WHERE "slug" = ? LIMIT 1`,
    slug
  );
  if (existing.length > 0) {
    slug = `${slug}-${randomUUID().slice(0, 4)}`;
  }

  const id = `cat_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const parentId = input.parentId?.trim() || null;
  const description = input.description?.trim() || null;
  const image = input.image?.trim() || null;
  const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : 1;

  let displayOrder = input.displayOrder;
  if (displayOrder === undefined || isNaN(displayOrder)) {
    const maxOrderRow = await prisma.$queryRawUnsafe<any[]>(
      parentId
        ? `SELECT MAX("displayOrder") as maxOrder FROM "Category" WHERE "parentId" = ?`
        : `SELECT MAX("displayOrder") as maxOrder FROM "Category" WHERE "parentId" IS NULL`,
      ...(parentId ? [parentId] : [])
    );
    const maxOrder = maxOrderRow[0]?.maxOrder;
    displayOrder = (maxOrder !== null && maxOrder !== undefined) ? Number(maxOrder) + 1 : 0;
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Category" ("id", "slug", "name", "description", "parentId", "displayOrder", "image", "isActive", "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    id,
    slug,
    name,
    description,
    parentId,
    displayOrder,
    image,
    isActive
  );

  return {
    id,
    slug,
    name,
    description,
    parentId,
    displayOrder,
    image,
    isActive: Boolean(isActive),
    createdAt: new Date(),
    updatedAt: new Date(),
    productCount: 0,
    children: [],
  };
}

export async function updateCategory(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string | null;
    parentId?: string | null;
    displayOrder?: number;
    image?: string | null;
    isActive?: boolean;
  }
): Promise<CategoryRecord> {
  const existingRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Category" WHERE "id" = ? LIMIT 1`,
    id
  );
  if (!existingRows || existingRows.length === 0) {
    throw new Error('Kategori bulunamadı.');
  }

  const current = existingRows[0];
  const name = input.name !== undefined ? input.name.trim() : current.name;
  if (!name) throw new Error('Kategori adı boş olamaz.');

  let slug = current.slug;
  if (input.slug !== undefined) {
    const nextSlug = slugifyCategory(input.slug.trim());
    if (nextSlug && nextSlug !== current.slug) {
      const duplicate = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "Category" WHERE "slug" = ? AND "id" != ? LIMIT 1`,
        nextSlug,
        id
      );
      if (duplicate.length > 0) throw new Error('Bu kategori bağlantısı (slug) zaten kullanımda.');
      slug = nextSlug;
    }
  }

  const description = input.description !== undefined ? input.description?.trim() || null : current.description;
  const parentId = input.parentId !== undefined ? (input.parentId?.trim() || null) : current.parentId;
  const image = input.image !== undefined ? (input.image?.trim() || null) : current.image;
  const displayOrder = input.displayOrder !== undefined ? Number(input.displayOrder) : Number(current.displayOrder);
  const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : current.isActive;

  // Prevent parentId being self
  if (parentId === id) {
    throw new Error('Bir kategori kendi kendisinin üst kategorisi olamaz.');
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "Category"
     SET "name" = ?, "slug" = ?, "description" = ?, "parentId" = ?, "displayOrder" = ?, "image" = ?, "isActive" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ?`,
    name,
    slug,
    description,
    parentId,
    displayOrder,
    image,
    isActive,
    id
  );

  return {
    id,
    slug,
    name,
    description,
    parentId,
    displayOrder,
    image,
    isActive: Boolean(isActive === 1 || isActive === true),
    createdAt: current.createdAt,
    updatedAt: new Date(),
  };
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const existingRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Category" WHERE "id" = ? LIMIT 1`,
    id
  );
  if (!existingRows || existingRows.length === 0) {
    return { success: false, error: 'Kategori bulunamadı.' };
  }
  const current = existingRows[0];

  // Check if child categories exist
  const children = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as count FROM "Category" WHERE "parentId" = ?`,
    id
  );
  const childCount = Number(children[0]?.count || 0);
  if (childCount > 0) {
    return {
      success: false,
      error: `Bu kategorinin altında ${childCount} adet alt kategori bulunmaktadır. Önce alt kategorileri silin veya başka bir kategoriye taşıyın.`,
    };
  }

  // Check if products are tied to this category
  const products = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as count FROM "Product" WHERE "category" = ? OR "subcategory" = ?`,
    current.slug,
    current.slug
  );
  const prodCount = Number(products[0]?.count || 0);
  if (prodCount > 0) {
    return {
      success: false,
      error: `Bu kategoriye atanmış ${prodCount} adet ürün bulunmaktadır. Kategoriyi silmeden önce bu ürünlerin kategorisini değiştirin.`,
    };
  }

  await prisma.$executeRawUnsafe(`DELETE FROM "Category" WHERE "id" = ?`, id);
  return { success: true };
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Category" SET "displayOrder" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
      i,
      orderedIds[i]
    );
  }
}
