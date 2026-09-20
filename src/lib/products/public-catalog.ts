import type { Product, ProductMedia, SiblingColor } from '@/types';

export const PUBLIC_PRODUCT_WHERE = { status: 'PUBLISHED' } as const;

type RawMedia = {
  id: string;
  kind: string;
  role: string;
  url: string;
  posterUrl?: string | null;
  alt: string;
  position: number;
  isCover: boolean;
};

type FamilyMember = SiblingColor & { status: string };

export type PublicProductRecord = Omit<Product, 'status' | 'media' | 'siblingColors'> & {
  status: string;
  media?: RawMedia[];
  family?: { products: FamilyMember[] } | null;
};

export const PUBLIC_PRODUCT_INCLUDE = {
  variants: true,
  media: { orderBy: { position: 'asc' as const } },
  family: {
    include: {
      products: {
        where: PUBLIC_PRODUCT_WHERE,
        select: { id: true, slug: true, category: true, color: true, image: true, status: true },
      },
    },
  },
} as const;

export function toPublicProduct(record: PublicProductRecord): Product {
  const media: ProductMedia[] = [...(record.media ?? [])]
    .filter((item) =>
      (item.kind === 'IMAGE' || item.kind === 'VIDEO') &&
      (item.role === 'FLATLAY' || item.role === 'MODEL' || item.role === 'DETAIL') &&
      !!item.url && (item.kind === 'IMAGE' || !!item.posterUrl)
    )
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      kind: item.kind as ProductMedia['kind'],
      role: item.role as ProductMedia['role'],
      url: item.url,
      posterUrl: item.posterUrl,
      alt: item.alt,
      position: item.position,
      isCover: item.isCover,
    }));
  const siblingColors: SiblingColor[] = (record.family?.products ?? [])
    .filter((item) => item.status === 'PUBLISHED' && item.id !== record.id && item.category === record.category)
    .map(({ id, slug, category, color, image }) => ({ id, slug, category, color, image }));
  const { family: _family, ...product } = record;
  return { ...product, status: 'PUBLISHED', media, siblingColors };
}

export interface PublicProductRepository {
  findFirst(args: {
    where: { status: 'PUBLISHED'; OR: ({ slug: string } | { id: string })[] };
    include?: typeof PUBLIC_PRODUCT_INCLUDE;
  }): Promise<PublicProductRecord | null>;
}

export interface PublicProductListRepository {
  findMany(args: {
    where: Record<string, unknown> & { status: 'PUBLISHED' };
    include?: typeof PUBLIC_PRODUCT_INCLUDE;
    orderBy?: { createdAt: 'asc' };
  }): Promise<PublicProductRecord[]>;
}

export async function publicList(
  repo: PublicProductListRepository,
  filters: Record<string, unknown> = {},
): Promise<Product[]> {
  const records = await repo.findMany({
    where: { ...filters, ...PUBLIC_PRODUCT_WHERE },
    include: PUBLIC_PRODUCT_INCLUDE,
    orderBy: { createdAt: 'asc' },
  });
  return records.map(toPublicProduct);
}

export async function publicFindBySlug(slug: string, repo: PublicProductRepository): Promise<Product | null> {
  const record = await repo.findFirst({
    where: { ...PUBLIC_PRODUCT_WHERE, OR: [{ slug }, { id: slug }] },
    include: PUBLIC_PRODUCT_INCLUDE,
  });
  return record ? toPublicProduct(record) : null;
}
