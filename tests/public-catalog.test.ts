import assert from 'node:assert/strict';
import test from 'node:test';
import { publicFindBySlug, publicList, toPublicProduct } from '../src/lib/products/public-catalog';

const black = {
  id: 'black', slug: 'siyah-crop', name: 'Siyah Crop', status: 'PUBLISHED',
  image: '/siyah.webp', color: 'Siyah', category: 'ic-giyim',
  description: '', price: 590,
};
const white = {
  id: 'white', slug: 'beyaz-crop', name: 'Beyaz Crop', status: 'PUBLISHED',
  image: '/beyaz.webp', color: 'Beyaz', category: 'ic-giyim',
  description: '', price: 590,
};
const unpublished = {
  id: 'draft', slug: 'mavi-crop', name: 'Mavi Crop', status: 'DRAFT',
  image: '', color: 'Mavi', category: 'ic-giyim', description: '', price: 590,
};

test('public mapping sorts actual media and drops draft family members', () => {
  const mapped = toPublicProduct({
    ...black,
    media: [
      { id: 'detail', kind: 'IMAGE', role: 'DETAIL', url: '/detail.webp', alt: 'Detay', position: 2, isCover: false },
      { id: 'flat', kind: 'IMAGE', role: 'FLATLAY', url: '/siyah.webp', alt: 'Düz çekim', position: 0, isCover: true },
    ],
    family: { products: [black, white, unpublished] },
  });
  assert.deepEqual(mapped.media?.map((item) => item.id), ['flat', 'detail']);
  assert.deepEqual(mapped.siblingColors?.map((item) => item.slug), ['beyaz-crop']);
});

test('public slug lookup never returns a draft', async () => {
  const records = [black, unpublished];
  const repo = {
    async findFirst({ where }: { where: { status: string; OR: { slug?: string; id?: string }[] } }) {
      return records.find((product) => product.status === where.status &&
        where.OR.some((clause) => clause.slug === product.slug || clause.id === product.id)) ?? null;
    },
  };
  assert.equal(await publicFindBySlug('mavi-crop', repo), null);
  assert.equal((await publicFindBySlug('siyah-crop', repo))?.id, 'black');
});

test('public list excludes drafts even when search matches', async () => {
  const records = [black, unpublished];
  const repo = {
    async findMany({ where }: { where: { status: string; OR?: { name?: { contains: string } }[] } }) {
      return records.filter((product) => product.status === where.status &&
        (!where.OR || where.OR.some((clause) => !clause.name || product.name.includes(clause.name.contains))));
    },
  };
  const listed = await publicList(repo, { OR: [{ name: { contains: 'Crop' } }] });
  assert.deepEqual(listed.map((item) => item.id), ['black']);
});
