import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { createDraft, saveVariantStock, saveProduct } from '../src/lib/admin/product-editor-service';
import { getInMemoryEmailSender } from '../src/lib/email/provider';

test('restocking an out-of-stock variant triggers email notification and marks StockAlert as notified', async () => {
  const sender = getInMemoryEmailSender();
  sender.clear();

  // 1. Create a draft product with 0 stock for size M
  const product = await createDraft(
    {
      name: `İpek Gömlek Test ${Date.now()}`,
      price: 2500,
      color: 'Siyah',
      category: 'ic-giyim',
      variants: [{ size: 'M', stock: 0 }, { size: 'S', stock: 5 }],
    },
    prisma
  );

  const mVariant = product.variants.find((v) => v.size === 'M')!;
  assert.equal(mVariant.stock, 0);

  // 2. Create StockAlert subscriber for size M
  const subscriberEmail = `alert-user-${Date.now()}@example.com`;
  const alert = await prisma.stockAlert.create({
    data: {
      productId: product.id,
      size: 'M',
      email: subscriberEmail,
      isNotified: false,
    },
  });

  assert.equal(alert.isNotified, false);

  // 3. Admin updates variant stock of M from 0 to 8
  await saveVariantStock(mVariant.id, 8, prisma);

  // Verify email sent
  const sent = sender.getSentEmails();
  const alertEmail = sent.find((e) => e.to === subscriberEmail);
  assert.ok(alertEmail, 'Expected stock alert email to be sent to subscriber');
  assert.match(alertEmail!.subject, new RegExp(product.name));
  assert.match(alertEmail!.html, /M beden/);

  // Verify DB state updated
  const updatedAlert = await prisma.stockAlert.findUnique({
    where: { id: alert.id },
  });
  assert.equal(updatedAlert?.isNotified, true);

  // 4. Updating stock again from 8 to 12 should not send duplicate alert
  sender.clear();
  await saveVariantStock(mVariant.id, 12, prisma);
  const reSent = sender.getSentEmails().filter((e) => e.to === subscriberEmail);
  assert.equal(reSent.length, 0, 'Should not re-notify already notified subscriber');

  // Clean up
  await prisma.stockAlert.delete({ where: { id: alert.id } }).catch(() => {});
  await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
});
