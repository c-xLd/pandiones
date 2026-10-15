import { SKU_PATTERN, compareAtPriceProblem, isValidEan13, isVatRate, normalizeBarcode, normalizeSku } from '@/lib/products/commerce-fields';
import { suggestSku } from '@/lib/products/sku';
import { MEDIA_ROLES, type MediaRole } from '@/lib/products/media-domain';

export { suggestSku };

/**
 * The editor's "Satış ve varyant bilgileri" model. Every colour is its own product (own stock, photos and
 * page) in one colour family, so the table is grouped by colour: price, list price and VAT belong to the
 * colour (product), barcode / stock / SKU to each size (variant). Pure; tested in tests/variant-model.test.ts.
 */

export type SizeRow = { size: string; stock: string; sku: string; barcode: string };

/**
 * A photo or video chosen for a colour that is not saved yet (no product to attach it to). Kept in the
 * browser and uploaded by the save that creates the colour; it counts as an unsaved change.
 */
export type StagedMedia = {
  id: string;
  file: File;
  kind: 'IMAGE' | 'VIDEO';
  role: MediaRole;
  /** Empty: `autoAlt` at upload time. */
  alt?: string;
  /** Object URL for the preview (images only). */
  preview: string | null;
  /** Videos: the staged photo used as poster. */
  posterId?: string;
  isCover?: boolean;
};

export const SHOT_LABEL: Record<MediaRole, string> = {
  MODEL_FRONT: 'manken ön çekim',
  MODEL_BACK: 'manken arka çekim',
  MODEL_SIDE: 'manken yan çekim',
  MODEL_WALK: 'manken hareketli çekim',
  MODEL: 'manken',
  FLATLAY: 'düz çekim',
  PACKSHOT: 'stüdyo dekupe çekim',
  HANGER: 'askı çekimi',
  FABRIC_DETAIL: 'kumaş ve doku detayı',
  STITCH_DETAIL: 'dikiş ve işçilik detayı',
  CLOSEUP: 'yakın plan detay',
  STYLING: 'stil ve kombin görünümü',
  DETAIL: 'detay',
};

/**
 * The description used when the admin leaves it empty: built at upload time, so it follows the product
 * name and the shot type chosen last (e.g. "Saten Gecelik – Beyaz, düz çekim 1").
 */
export function autoAlt(productName: string, color: string, kind: 'IMAGE' | 'VIDEO', role: MediaRole, n: number): string {
  const name = productName.trim() || 'Ürün';
  const roleLabel = SHOT_LABEL[role] ?? 'görsel';
  return `${name} – ${color}, ${kind === 'VIDEO' ? 'video' : `${roleLabel} ${n}`}`.slice(0, 240);
}

/** One saved photo or video of a colour, as the media strip shows it. Saved on its own, never "unsaved". */
export type MediaSummary = {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  role: MediaRole;
  url: string;
  posterUrl: string | null;
  alt: string;
  isCover: boolean;
};

export type ColorGroup = {
  /** Stable React key: the product id, or `new:<colour>` until the colour is created. */
  key: string;
  /** null until saved: "Renk ekle" creates the product on the next save. */
  productId: string | null;
  /** The product being edited (its colour can be renamed here; the others are edited on their own page). */
  isCurrent: boolean;
  color: string;
  status?: 'DRAFT' | 'PUBLISHED';
  image?: string;
  /** The colour's photos and video in gallery order (empty until the colour is saved). */
  media: MediaSummary[];
  /** Files chosen before the colour was saved; uploaded on save. */
  staged?: StagedMedia[];
  price: string;
  compareAtPrice: string;
  vatRate: string;
  sizes: SizeRow[];
};

export type VariantErrors = {
  general?: string;
  /** `${groupKey}|price`, `${groupKey}|compareAtPrice`, `${groupKey}|${size}|barcode` … → message */
  cells: Record<string, string>;
};

export const cellKey = (groupKey: string, field: string, size?: string) => (size ? `${groupKey}|${size}|${field}` : `${groupKey}|${field}`);

const fold = (text: string) => text.trim().toLocaleLowerCase('tr-TR');

/** All sizes in use, in the order they were first added. */
export function sizesOf(groups: ColorGroup[]): string[] {
  const seen: string[] = [];
  for (const group of groups) for (const row of group.sizes) if (!seen.includes(row.size)) seen.push(row.size);
  return seen;
}

/** Applies the size picker: new sizes are added to every colour (stock 0), removed ones leave every colour. */
export function applySizes(groups: ColorGroup[], sizes: string[]): ColorGroup[] {
  return groups.map((group) => {
    const kept = group.sizes.filter((row) => sizes.includes(row.size));
    const added = sizes.filter((size) => !group.sizes.some((row) => row.size === size)).map((size) => ({ size, stock: '0', sku: '', barcode: '' }));
    const ordered = [...kept, ...added].sort((a, b) => sizes.indexOf(a.size) - sizes.indexOf(b.size));
    return { ...group, sizes: ordered };
  });
}

/** A new colour: the sizes in use, stock 0, the current colour's price, list price and VAT. */
export function newColorGroup(color: string, groups: ColorGroup[], isCurrent: boolean): ColorGroup {
  const template = groups.find((group) => group.isCurrent) ?? groups[0];
  return {
    key: `new:${color}`,
    productId: null,
    isCurrent,
    color,
    media: [],
    price: template?.price ?? '',
    compareAtPrice: template?.compareAtPrice ?? '',
    vatRate: template?.vatRate ?? '10',
    sizes: sizesOf(groups).map((size) => ({ size, stock: '0', sku: '', barcode: '' })),
  };
}

export const hasColor = (groups: ColorGroup[], color: string) => groups.some((group) => fold(group.color) === fold(color));

/**
 * "Kodları yeniden oluştur": every size gets the code derived from the current name and colour, typed ones
 * included. Empty codes need nothing: the server fills them on save (the cell shows the suggestion).
 */
export function regenerateSkus(groups: ColorGroup[], productName: string): ColorGroup[] {
  return groups.map((group) => ({
    ...group,
    sizes: group.sizes.map((row) => ({ ...row, sku: suggestSku(productName, group.color, row.size) })),
  }));
}

/** How many codes "Kodları yeniden oluştur" would change. */
export function skusToChange(groups: ColorGroup[], productName: string): number {
  return groups.reduce((sum, group) => sum + group.sizes.filter((row) => normalizeSku(row.sku) !== suggestSku(productName, group.color, row.size)).length, 0);
}

/** Everything the server would refuse, per cell, so the admin sees it before saving. */
export function validateGroups(groups: ColorGroup[]): VariantErrors {
  const errors: VariantErrors = { cells: {} };
  if (!groups.length) {
    errors.general = 'En az bir renk ekleyin.';
    return errors;
  }
  const skuOwners = new Map<string, string>();
  const barcodeOwners = new Map<string, string>();
  for (const group of groups) {
    if (!group.color.trim()) errors.cells[cellKey(group.key, 'color')] = 'Renk adını girin.';
    const price = Number(group.price.replace(',', '.'));
    if (!group.price.trim() || !Number.isFinite(price) || price <= 0) errors.cells[cellKey(group.key, 'price')] = 'Sıfırdan büyük fiyat girin.';
    const listPrice = group.compareAtPrice.trim() ? Number(group.compareAtPrice.replace(',', '.')) : null;
    const listProblem = Number.isFinite(price) ? compareAtPriceProblem(price, listPrice) : null;
    if (listProblem) errors.cells[cellKey(group.key, 'compareAtPrice')] = listProblem;
    if (!isVatRate(Number(group.vatRate))) errors.cells[cellKey(group.key, 'vatRate')] = 'KDV seçin.';
    if (!group.sizes.length) errors.cells[cellKey(group.key, 'sizes')] = `${group.color || 'Bu renk'} için en az bir beden olmalı.`;
    for (const row of group.sizes) {
      const stock = Number(row.stock);
      if (row.stock.trim() === '' || !Number.isInteger(stock) || stock < 0) errors.cells[cellKey(group.key, 'stock', row.size)] = '0 veya daha büyük tam sayı.';
      const sku = normalizeSku(row.sku);
      if (sku) {
        if (!SKU_PATTERN.test(sku)) errors.cells[cellKey(group.key, 'sku', row.size)] = '2–40 karakter; harf, rakam, . - _ /';
        else if (skuOwners.has(sku)) errors.cells[cellKey(group.key, 'sku', row.size)] = `Aynı kod ${skuOwners.get(sku)} satırında da var.`;
        else skuOwners.set(sku, `${group.color} ${row.size}`);
      }
      const barcode = normalizeBarcode(row.barcode);
      if (barcode) {
        if (!isValidEan13(barcode)) errors.cells[cellKey(group.key, 'barcode', row.size)] = '13 haneli EAN-13; kontrol hanesi tutmuyor.';
        else if (barcodeOwners.has(barcode)) errors.cells[cellKey(group.key, 'barcode', row.size)] = `Aynı barkod ${barcodeOwners.get(barcode)} satırında da var.`;
        else barcodeOwners.set(barcode, `${group.color} ${row.size}`);
      }
    }
  }
  const colors = groups.map((group) => fold(group.color));
  if (new Set(colors).size !== colors.length) errors.general = 'Aynı renk iki kez eklenmiş.';
  if (Object.keys(errors.cells).length && !errors.general) errors.general = 'Varyant tablosunda düzeltilmesi gereken alanlar var.';
  return errors;
}

/** The PATCH/POST body for one colour's product. */
export function groupPayload(group: ColorGroup) {
  return {
    color: group.color.trim(),
    price: Number(group.price.replace(',', '.')),
    compareAtPrice: group.compareAtPrice.trim() ? Number(group.compareAtPrice.replace(',', '.')) : null,
    vatRate: Number(group.vatRate),
    variants: group.sizes.map((row) => ({ size: row.size, stock: Number(row.stock), sku: normalizeSku(row.sku), barcode: normalizeBarcode(row.barcode) })),
  };
}

type LoadedProduct = {
  id: string;
  color: string;
  status: 'DRAFT' | 'PUBLISHED';
  price: number;
  compareAtPrice?: number | null;
  vatRate?: number;
  image?: string;
  media?: { id: string; kind: string; role: string; url: string; posterUrl?: string | null; alt: string; isCover: boolean }[];
  variants: { size: string; stock: number; sku?: string | null; barcode?: string | null }[];
};

export function mediaSummaries(media: LoadedProduct['media']): MediaSummary[] {
  return (media ?? []).map((item) => ({
    id: item.id,
    kind: item.kind === 'VIDEO' ? 'VIDEO' : 'IMAGE',
    role: MEDIA_ROLES.includes(item.role as MediaRole) ? (item.role as MediaRole) : 'MODEL',
    url: item.url,
    posterUrl: item.posterUrl ?? null,
    alt: item.alt,
    isCover: item.isCover,
  }));
}

export function groupFromProduct(product: LoadedProduct, isCurrent: boolean): ColorGroup {
  const cover = product.media?.find((item) => item.isCover);
  return {
    key: product.id,
    productId: product.id,
    isCurrent,
    color: product.color,
    status: product.status,
    image: cover?.posterUrl || cover?.url || product.image || undefined,
    media: mediaSummaries(product.media),
    price: String(product.price),
    compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
    vatRate: String(product.vatRate ?? 10),
    sizes: product.variants.map((variant) => ({ size: variant.size, stock: String(variant.stock), sku: variant.sku ?? '', barcode: variant.barcode ?? '' })),
  };
}

/** Comparable form (for "unsaved changes"): what would be sent. */
export const groupSnapshot = (group: ColorGroup) =>
  JSON.stringify({ key: group.key, ...groupPayload(group), staged: (group.staged ?? []).map((item) => [item.id, item.role, item.alt ?? '', item.posterId ?? '', Boolean(item.isCover)]) });
