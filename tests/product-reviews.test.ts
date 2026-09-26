import assert from 'node:assert/strict';
import test from 'node:test';
import { GET as getReviews, POST as postReview } from '../src/app/api/products/[id]/reviews/route';
import { prisma } from '../src/lib/prisma';

test('reviews endpoint returns null averageRating when product has no reviews', async () => {
  // Create a product with 0 reviews
  const product = await prisma.product.create({
    data: {
      slug: `no-rev-${Date.now()}`,
      name: 'Yorumsuz Parça',
      price: 1500,
      color: 'Ekru',
      category: 'ic-giyim',
      image: '/assets/sample.webp',
      status: 'PUBLISHED',
      description: 'Açıklama',
    },
  });

  const params = { params: Promise.resolve({ id: product.id }) };
  const req = new Request(`http://localhost:3000/api/products/${product.id}/reviews`);
  const res = await getReviews(req, params);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.total, 0);
  assert.equal(data.averageRating, null, 'averageRating must be null when there are no reviews, not 5');

  // Cleanup
  await prisma.product.delete({ where: { id: product.id } });
});

test('unauthenticated caller cannot post review', async () => {
  const product = await prisma.product.findFirst({ where: { status: 'PUBLISHED' } });
  assert.ok(product);

  const params = { params: Promise.resolve({ id: product.id }) };
  const req = new Request(`http://localhost:3000/api/products/${product.id}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: 5, comment: 'Mükemmel ürün' }),
  });

  const res = await postReview(req, params);
  assert.equal(res.status, 401, 'Anonymous user must be rejected with 401');
  const data = await res.json();
  assert.match(data.error, /giriş yapınız/i);
});
