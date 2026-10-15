export type ProductStatus = 'DRAFT' | 'PUBLISHED';
export type MediaKind = 'IMAGE' | 'VIDEO';
export type MediaRole =
  | 'MODEL_FRONT'
  | 'MODEL_BACK'
  | 'MODEL_SIDE'
  | 'MODEL_WALK'
  | 'MODEL'
  | 'FLATLAY'
  | 'PACKSHOT'
  | 'HANGER'
  | 'FABRIC_DETAIL'
  | 'STITCH_DETAIL'
  | 'CLOSEUP'
  | 'STYLING'
  | 'DETAIL';

export const MEDIA_ROLES: readonly MediaRole[] = [
  'MODEL_FRONT',
  'MODEL_BACK',
  'MODEL_SIDE',
  'MODEL_WALK',
  'MODEL',
  'FLATLAY',
  'PACKSHOT',
  'HANGER',
  'FABRIC_DETAIL',
  'STITCH_DETAIL',
  'CLOSEUP',
  'STYLING',
  'DETAIL',
] as const;

export type FamilyCandidate = {
  id: string;
  category: string;
  color: string;
};

export type ProductMediaInput = {
  id?: string;
  kind: MediaKind;
  role?: MediaRole;
  url: string;
  posterUrl?: string | null;
  alt?: string;
  position?: number;
  isCover: boolean;
};

export type CardFrame = {
  kind: MediaKind;
  src: string;
  posterSrc?: string;
  alt: string;
};

export type PublishCandidate = {
  price: number;
  category: string;
  /** Slugs of the active top-level categories (the Category table); the product must sit in one of them. */
  rootCategories: readonly string[];
  color: string;
  variants: { size: string; stock: number }[];
  media: Pick<ProductMediaInput, 'kind' | 'url' | 'posterUrl' | 'isCover'>[];
};

export class ProductMediaRuleError extends Error {
  constructor(public readonly code: 'COLOR_CONFLICT' | 'CATEGORY_CONFLICT') {
    super(code);
  }
}

export function normalizeColor(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}

export function assertFamilyCandidate(candidate: FamilyCandidate, members: FamilyCandidate[]): void {
  for (const member of members) {
    if (member.id === candidate.id) continue;
    if (member.category !== candidate.category) {
      throw new ProductMediaRuleError('CATEGORY_CONFLICT');
    }
    if (normalizeColor(member.color) === normalizeColor(candidate.color)) {
      throw new ProductMediaRuleError('COLOR_CONFLICT');
    }
  }
}

export function selectCardMedia(product: { image: string; media?: ProductMediaInput[] }): { cover: CardFrame; secondary?: CardFrame } {
  const ordered = [...(product.media ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const coverMedia = ordered.find((item) => item.isCover) ?? ordered[0];
  if (!coverMedia) {
    return { cover: { kind: 'IMAGE', src: product.image, alt: '' } };
  }
  const cover: CardFrame = {
    kind: coverMedia.kind,
    src: coverMedia.url,
    ...(coverMedia.kind === 'VIDEO' && coverMedia.posterUrl ? { posterSrc: coverMedia.posterUrl } : {}),
    alt: coverMedia.alt ?? '',
  };
  const secondaryMedia = ordered.find((item) => item !== coverMedia && item.kind === 'IMAGE');
  if (!secondaryMedia) return { cover };
  return {
    cover,
    secondary: { kind: 'IMAGE', src: secondaryMedia.url, alt: secondaryMedia.alt ?? '' },
  };
}

export function toGalleryFrames(product: { image: string; media?: ProductMediaInput[] }): CardFrame[] {
  if (!product.media?.length) return product.image ? [{ kind: 'IMAGE', src: product.image, alt: '' }] : [];
  const sorted = [...product.media].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const coverIndex = sorted.findIndex((m) => m.isCover);
  const ordered = coverIndex > 0 ? [sorted[coverIndex], ...sorted.filter((_, i) => i !== coverIndex)] : sorted;
  return ordered.map((media) => ({
    kind: media.kind,
    src: media.url,
    ...(media.kind === 'VIDEO' && media.posterUrl ? { posterSrc: media.posterUrl } : {}),
    alt: media.alt || '',
  }));
}

export function getPublishErrors(product: PublishCandidate): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(product.price) || product.price <= 0) errors.push('price');
  if (!product.rootCategories.includes(product.category)) errors.push('category');
  if (!product.color.trim()) errors.push('color');
  if (!product.variants.length || product.variants.some((variant) =>
    !variant.size.trim() || !Number.isInteger(variant.stock) || variant.stock < 0
  )) errors.push('variants');
  const covers = product.media.filter((media) => media.isCover);
  if (covers.length !== 1 || !covers[0]?.url) errors.push('cover');
  if (covers[0]?.kind === 'VIDEO' && !covers[0].posterUrl) errors.push('poster');
  if (!product.media.some((media) =>
    media.kind === 'IMAGE' && !!media.url || media.kind === 'VIDEO' && !!media.posterUrl
  )) errors.push('image');
  return errors;
}
