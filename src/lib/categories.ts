import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import type { Category } from '@prisma/client';
import { slugifyCategory } from '@/lib/category-utils';
import { isReservedRootSlug } from '@/lib/routes';
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
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  productCount?: number;
  children?: CategoryRecord[];
  parent?: CategoryRecord | null;
}

const toRecord = (row: Category): CategoryRecord => ({ ...row });

export async function getAllCategories(includeInactive = false): Promise<CategoryRecord[]> {
  const rows = await prisma.category.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(toRecord);
}

export async function getCategoriesTree(includeInactive = false): Promise<CategoryRecord[]> {
  const all = await getAllCategories(includeInactive);

  // Product counts per root category slug and per subcategory slug
  const rootCounts = await prisma.product.groupBy({ by: ['category'], _count: { _all: true } });
  const rootCountMap = new Map<string, number>();
  for (const r of rootCounts) rootCountMap.set(r.category, r._count._all);

  const subCounts = await prisma.product.groupBy({ by: ['subcategory'], where: { subcategory: { not: null } }, _count: { _all: true } });
  const subCountMap = new Map<string, number>();
  for (const s of subCounts) {
    if (s.subcategory) subCountMap.set(s.subcategory, s._count._all);
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
  const row = await prisma.category.findFirst({ where: { slug: { equals: slug, mode: 'insensitive' } } });
  if (!row) return null;
  const cat = toRecord(row);
  if (!cat.parentId) {
    const children = await prisma.category.findMany({ where: { parentId: cat.id, isActive: true }, orderBy: { displayOrder: 'asc' } });
    cat.children = children.map(toRecord);
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
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
}): Promise<CategoryRecord> {
  const name = input.name.trim();
  if (!name) throw new Error('Kategori adı zorunludur.');

  let slug = slugifyCategory(input.slug?.trim() || name);
  if (!slug) throw new Error('Geçerli bir kategori bağlantısı (slug) oluşturulamadı.');

  // Ensure unique slug
  const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    slug = `${slug}-${randomUUID().slice(0, 4)}`;
  }

  const id = `cat_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const parentId = input.parentId?.trim() || null;
  if (!parentId && isReservedRootSlug(slug)) {
    throw new Error(`"${slug}" bir sayfa adresi olarak kullanılıyor; ana kategori için başka bir bağlantı seçin.`);
  }
  const description = input.description?.trim() || null;
  const image = input.image?.trim() || null;
  const isActive = input.isActive ?? true;
  const seoTitle = input.seoTitle?.trim() || null;
  const seoDescription = input.seoDescription?.trim() || null;
  const canonicalUrl = input.canonicalUrl?.trim() || null;
  const noindex = input.noindex ?? false;

  let displayOrder = input.displayOrder;
  if (displayOrder === undefined || isNaN(displayOrder)) {
    const max = await prisma.category.aggregate({ where: { parentId }, _max: { displayOrder: true } });
    displayOrder = max._max.displayOrder !== null ? max._max.displayOrder + 1 : 0;
  }

  const created = await prisma.category.create({
    data: { id, slug, name, description, parentId, displayOrder, image, isActive, seoTitle, seoDescription, canonicalUrl, noindex },
  });
  return { ...toRecord(created), productCount: 0, children: [] };
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
    seoTitle?: string | null;
    seoDescription?: string | null;
    canonicalUrl?: string | null;
    noindex?: boolean;
  }
): Promise<CategoryRecord> {
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) {
    throw new Error('Kategori bulunamadı.');
  }

  const name = input.name !== undefined ? input.name.trim() : current.name;
  if (!name) throw new Error('Kategori adı boş olamaz.');

  let slug = current.slug;
  if (input.slug !== undefined) {
    const nextSlug = slugifyCategory(input.slug.trim());
    if (nextSlug && nextSlug !== current.slug) {
      const duplicate = await prisma.category.findFirst({ where: { slug: nextSlug, NOT: { id } }, select: { id: true } });
      if (duplicate) throw new Error('Bu kategori bağlantısı (slug) zaten kullanımda.');
      slug = nextSlug;
    }
  }

  const description = input.description !== undefined ? input.description?.trim() || null : current.description;
  const parentId = input.parentId !== undefined ? (input.parentId?.trim() || null) : current.parentId;
  if (!parentId && isReservedRootSlug(slug)) {
    throw new Error(`"${slug}" bir sayfa adresi olarak kullanılıyor; ana kategori için başka bir bağlantı seçin.`);
  }
  const image = input.image !== undefined ? (input.image?.trim() || null) : current.image;
  const displayOrder = input.displayOrder !== undefined ? Number(input.displayOrder) : current.displayOrder;
  const isActive = input.isActive ?? current.isActive;
  const seoTitle = input.seoTitle !== undefined ? (input.seoTitle?.trim() || null) : current.seoTitle;
  const seoDescription = input.seoDescription !== undefined ? (input.seoDescription?.trim() || null) : current.seoDescription;
  const canonicalUrl = input.canonicalUrl !== undefined ? (input.canonicalUrl?.trim() || null) : current.canonicalUrl;
  const noindex = input.noindex !== undefined ? input.noindex : current.noindex;

  // Prevent parentId being self
  if (parentId === id) {
    throw new Error('Bir kategori kendi kendisinin üst kategorisi olamaz.');
  }

  const updated = await prisma.category.update({
    where: { id },
    data: { name, slug, description, parentId, displayOrder, image, isActive, seoTitle, seoDescription, canonicalUrl, noindex },
  });
  return toRecord(updated);
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const current = await prisma.category.findUnique({ where: { id }, select: { slug: true } });
  if (!current) {
    return { success: false, error: 'Kategori bulunamadı.' };
  }

  // Check if child categories exist
  const childCount = await prisma.category.count({ where: { parentId: id } });
  if (childCount > 0) {
    return {
      success: false,
      error: `Bu kategorinin altında ${childCount} adet alt kategori bulunmaktadır. Önce alt kategorileri silin veya başka bir kategoriye taşıyın.`,
    };
  }

  // Check if products are tied to this category
  const prodCount = await prisma.product.count({ where: { OR: [{ category: current.slug }, { subcategory: current.slug }] } });
  if (prodCount > 0) {
    return {
      success: false,
      error: `Bu kategoriye atanmış ${prodCount} adet ürün bulunmaktadır. Kategoriyi silmeden önce bu ürünlerin kategorisini değiştirin.`,
    };
  }

  await prisma.category.delete({ where: { id } });
  return { success: true };
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await prisma.$transaction(orderedIds.map((id, index) => prisma.category.update({ where: { id }, data: { displayOrder: index } })));
}
