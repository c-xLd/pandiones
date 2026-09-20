export type ProductStatus = 'DRAFT' | 'PUBLISHED';
export type MediaKind = 'IMAGE' | 'VIDEO';
export type MediaRole = 'FLATLAY' | 'MODEL' | 'DETAIL';

export type FamilyCandidate = {
  id: string;
  category: string;
  color: string;
};

export type ProductMediaInput = {
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

export function getPublishErrors(product: PublishCandidate): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(product.price) || product.price <= 0) errors.push('price');
  if (!['ic-giyim', 'ev-giyim'].includes(product.category)) errors.push('category');
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
