import assert from 'node:assert/strict';
import test from 'node:test';
import { CURATED_HOMEPAGE_ASSETS, getAdminMediaGallery } from '../src/lib/admin/media-gallery';
import { GET } from '../src/app/api/admin/media/route';
import { prisma } from '../src/lib/prisma';

test('getAdminMediaGallery: returns curated campaign and homepage assets', async () => {
  const items = await getAdminMediaGallery(prisma);
  assert.ok(items.length >= CURATED_HOMEPAGE_ASSETS.length);

  // Check campaign poster asset exists
  const posterAsset = items.find((i) => i.role === 'POSTER' || i.url.includes('campaign-portrait'));
  assert.ok(posterAsset, 'Campaign portrait / poster asset must exist in gallery');
  assert.equal(posterAsset?.category, 'campaign');

  // Check URLs are unique
  const urls = items.map((i) => i.url);
  const uniqueUrls = new Set(urls);
  assert.equal(urls.length, uniqueUrls.size, 'Gallery items must have unique URLs');
});

test('getAdminMediaGallery: filters by category and search query', async () => {
  const campaignOnly = await getAdminMediaGallery(prisma, { category: 'campaign' });
  assert.ok(campaignOnly.length > 0);
  for (const item of campaignOnly) {
    assert.equal(item.category, 'campaign');
  }

  const queryItems = await getAdminMediaGallery(prisma, { query: 'dantel' });
  assert.ok(queryItems.length > 0);
  for (const item of queryItems) {
    const text = `${item.title} ${item.alt} ${item.url}`.toLowerCase();
    assert.ok(text.includes('dantel'), `Item ${item.title} must match search query "dantel"`);
  }
});

test('GET /api/admin/media: unauthenticated request is blocked with 403', async () => {
  const req = new Request('https://pandiones.com/api/admin/media', { method: 'GET' });
  const res = await GET(req);
  assert.equal(res.status, 403);
});
