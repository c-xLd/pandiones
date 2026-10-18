import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOMEPAGE_DEFAULTS,
  diffHomePageConfig,
  validateHomePageConfig,
} from '../src/lib/homepage/shared';
import { GET, PUT } from '../src/app/api/admin/homepage/route';

test('validateHomePageConfig: accepts default configuration', () => {
  const result = validateHomePageConfig(HOMEPAGE_DEFAULTS);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.values.hero.title, HOMEPAGE_DEFAULTS.hero.title);
    assert.equal(result.values.categoryStories.length, 3);
  }
});

test('validateHomePageConfig: rejects banned brand words (atölye, maison, istanbul)', () => {
  const badHero = {
    ...HOMEPAGE_DEFAULTS,
    hero: {
      ...HOMEPAGE_DEFAULTS.hero,
      title: 'Özel Atölye Tasarımı',
    },
  };
  const result1 = validateHomePageConfig(badHero);
  assert.equal(result1.ok, false);
  if (!result1.ok) {
    assert.match(result1.errors['hero.title'], /Marka kurallarına aykırı/);
  }

  const badBrand = {
    ...HOMEPAGE_DEFAULTS,
    brandStory: {
      ...HOMEPAGE_DEFAULTS.brandStory,
      lead: 'İstanbul ruhunu yansıtan parçalar.',
    },
  };
  const result2 = validateHomePageConfig(badBrand);
  assert.equal(result2.ok, false);
  if (!result2.ok) {
    assert.match(result2.errors['brandStory.lead'], /Marka kurallarına aykırı/);
  }
});

test('validateHomePageConfig: validates product count and URLs', () => {
  const badCount = {
    ...HOMEPAGE_DEFAULTS,
    collectionGrid: {
      ...HOMEPAGE_DEFAULTS.collectionGrid,
      productCount: 1, // Minimum is 2
    },
  };
  const res1 = validateHomePageConfig(badCount);
  assert.equal(res1.ok, false);

  const badHref = {
    ...HOMEPAGE_DEFAULTS,
    hero: {
      ...HOMEPAGE_DEFAULTS.hero,
      buttonHref: 'javascript:void(0)',
    },
  };
  const res2 = validateHomePageConfig(badHref);
  assert.equal(res2.ok, false);
  if (!res2.ok) {
    assert.match(res2.errors['hero.buttonHref'], /Bağlantı/);
  }
});

test('diffHomePageConfig: detects changes between configurations', () => {
  const modified = {
    ...HOMEPAGE_DEFAULTS,
    hero: {
      ...HOMEPAGE_DEFAULTS.hero,
      title: 'Yeni Başlık',
    },
    nightCampaign: {
      ...HOMEPAGE_DEFAULTS.nightCampaign,
      enabled: false,
    },
  };
  const diff = diffHomePageConfig(HOMEPAGE_DEFAULTS, modified);
  assert.ok('hero' in diff);
  assert.ok('nightCampaign' in diff);
  assert.ok(!('brandStory' in diff));
});

test('GET & PUT /api/admin/homepage: unauthenticated requests return 403', async () => {
  const getReq = new Request('https://pandiones.com/api/admin/homepage', { method: 'GET' });
  const getRes = await GET(getReq);
  assert.equal(getRes.status, 403);

  const putReq = new Request('https://pandiones.com/api/admin/homepage', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(HOMEPAGE_DEFAULTS),
  });
  const putRes = await PUT(putReq);
  assert.equal(putRes.status, 403);
});
