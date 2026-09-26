# Product Media and Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yönetici panelinden gerçek ürün fotoğrafı, video ve renk ailesi yönetmek; koleksiyon ve ürün detayında yalnız bu doğrulanmış medyayı göstermek.

**Architecture:** Renkler ayrı `Product` kayıtları olarak kalır ve `ProductFamily` ile bağlanır. Sıralı `ProductMedia` kayıtları ile seçilmiş kapak, ikinci kare ve isteğe bağlı video tutulur; yeni ürün taslak başlar ve doğrulanmadan yayınlanmaz. Güvenli yükleme depolama adaptöründen geçer; herkese açık sorgular yalnız yayınlanmış kayıtları döner.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 6 + SQLite, mevcut CSS tokenları, Node test runner + `tsx`.

**Spec:** `docs/superpowers/specs/2026-09-20-product-media-admin-design.md`

## Global Constraints

- Mevcut `Product.image` alanı eski tüketiciler için kanonik kapak/poster URL'si olarak kalır; medyasız taslakta boş string olabilir.
- Eski ürünler `PUBLISHED` kalır; yeni ürünler `DRAFT` başlar. Genel API, arama, ürün sayfaları ve Merchant feed taslakları göstermez.
- Her renk ayrı ürün, fiyat, beden stoğu ve URL taşır. Aynı ailede kategori uyuşmazlığı ve normalize edilmiş tekrar renk reddedilir.
- Ürüne ait olmayan görsel/video, sahte varyant veya aynı ürünü çoğaltan kart oluşturulmaz.
- JPEG/PNG/WebP en çok 10 MB; MP4/WebM en çok 50 MB. Gerçek MIME, imza ve byte boyutu sunucuda doğrulanır; video posteri zorunludur.
- Yerel dosya depolaması yalnız geliştirmede; üretimde kalıcı S3-uyumlu depolama yapılandırılmadıysa yükleme açık hatayla durur.
- Video `preload="none"`; mobilde açık oynat düğmesi; azaltılmış harekette otomatik oynatma yok; aynı anda en çok bir kart videosu oynar.
- Mevcut kirli çalışma ağacı kullanıcıya aittir. İlgisiz değişiklikleri geri alma, seed çalıştırma veya üretim DB'sinde `db:push --accept-data-loss` yok.
- Her görevde önce başarısız test, sonra en küçük kod, yeşil test ve yalnız o görevin dosyalarını kapsayan commit.

## Review Focus

1. `Siyah` ile ` siyah ` aynı aileye eklenirse ikinci bağlantı 409 almalı, iki ürünün aile durumu değişmemeli (Task 4 testi).
2. Dosya başlığı uzantıya/MIME'a uymuyorsa veya sınırı aşarsa nesne depolamaya tek byte yazılmamalı (Task 3 testi).
3. Video posteri veya kapak eksik taslak yayınlama isteği 400 almalı; genel katalogda görünmemeli (Task 4 testi).
4. Yayınlanmış ürünün tek kapağı silinmek istenirse işlem reddedilmeli; eski görsel açık kalmalı (Task 4 testi).
5. Başka ürüne ait medya ID'siyle sıralama/silme isteği 404 almalı, hedef ürünün medyası değişmemeli (Task 4 testi).

---

## File Map

- `prisma/schema.prisma`, `prisma/migrations/20260920000000_baseline/migration.sql`, `prisma/migrations/20260920010000_product_media/migration.sql`: mevcut şemanın migration başlangıcı ve veri koruyan ekleme.
- `src/lib/products/media-domain.ts`: tipler, kapak/ikinci kare seçimi, aile ve yayınlama kuralları; saf fonksiyonlar.
- `src/lib/products/public-catalog.ts`: tek `PUBLISHED` sorgu kuralı ve genel API/ürün sayfası için medya-kardeş eşleme.
- `src/lib/media/validate-upload.ts`, `src/lib/media/storage.ts`: dosya güvenliği ve geliştirme/kalıcı nesne depolama sınırı.
- `src/app/api/admin/upload/route.ts`, `src/app/api/admin/products/route.ts`, `src/app/api/admin/products/[id]/route.ts`, `src/app/api/admin/products/[id]/media/route.ts`, `src/app/api/admin/products/[id]/publish/route.ts`, `src/app/api/admin/product-families/route.ts`: ADMIN sözleşmesi.
- `src/components/admin/ProductEditor.tsx`, `src/app/yonetim/page.tsx`: taslak/medya/renk/yayınlama arayüzü.
- `src/components/collection/CollectionProductCard.tsx`, `src/app/koleksiyon/CollectionClient.tsx`, `src/app/globals.css`: tek gerçek ürünlük karma medya kartı ve renk bağlantıları.
- `src/components/product/ProductColorLinks.tsx`, `src/app/urunler/[slug]/ProductDetailClient.tsx`, her iki ürün detay sayfası: gerçek kardeş renkleri ve medya galerisi.
- `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`, `src/app/api/feed/google-merchant/route.ts`: genel görünürlük ve doğru medya.
- `src/types/index.ts`, `tests/*.test.ts(x)`, `docs/{API,DATA,SECURITY,QA}.md`, `docs/pages/{ADMIN,STOREFRONT}.md`, `DESIGN.md`, `README.md`: ortak tipler, sözleşme testleri ve doküman eşlemesi.

## Test Runner Note

Bu Windows oturumunda `node --import tsx --test` sistem `os.userInfo()` hatası verebiliyor. TS/TSX dosyası için mevcut çalışan komut biçimi:

```powershell
node -e "require('node:os').userInfo=()=>({username:'codex'});require('tsx/cjs');require('./tests/FILE.test.ts')"
```

`FILE` görevdeki gerçek dosya adıyla değiştirilir. Normal ortamlarda `node --import tsx --test tests/FILE.test.ts` tercih edilir.
Bu oturumda `npx` yürütücüsü eksik global `npx-cli.js` yoluna işaret ediyor. Prisma komutlarını gerektiğinde `./node_modules/.bin/prisma.cmd` ile çalıştır; `npm run build` için kurulu `npm` kullanılabilir. Test komutlarının sonucu bu ortam sorunu yüzünden atlanmış sayılmamalı.

### Task 1: Veri şeması ve saf kurallar

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260920000000_baseline/migration.sql`, `prisma/migrations/20260920010000_product_media/migration.sql`
- Create: `src/lib/products/media-domain.ts`
- Create: `tests/product-media-domain.test.ts`

**Interfaces:**
- Produces: `ProductStatus`, `MediaKind`, `MediaRole`; `normalizeColor(value: string): string`; `assertFamilyCandidate(candidate, members): void`; `selectCardMedia(product): { cover: CardFrame; secondary?: CardFrame }`; `getPublishErrors(product): string[]`.
- `CardFrame` is `{ kind: 'IMAGE' | 'VIDEO'; src: string; posterSrc?: string; alt: string }`. Later tasks use these exact names.

- [ ] **Step 1: Write failing domain tests** in `tests/product-media-domain.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeColor, assertFamilyCandidate, selectCardMedia, getPublishErrors } from '../src/lib/products/media-domain';

test('color family rejects casing/space duplicates and category mismatch', () => {
  assert.equal(normalizeColor(' Siyah '), 'siyah');
  assert.throws(() => assertFamilyCandidate({ id: 'b', category: 'ic-giyim', color: ' siyah ' }, [{ id: 'a', category: 'ic-giyim', color: 'Siyah' }]));
  assert.throws(() => assertFamilyCandidate({ id: 'c', category: 'ev-giyim', color: 'Beyaz' }, [{ id: 'a', category: 'ic-giyim', color: 'Siyah' }]));
});

test('draft needs a real cover while old single-image product still has a frame', () => {
  assert.deepEqual(selectCardMedia({ image: '/assets/lace.webp', media: [] }).cover.src, '/assets/lace.webp');
  assert.ok(getPublishErrors({ price: 100, category: 'ic-giyim', color: 'Siyah', variants: [{ size: 'S', stock: 1 }], media: [] }).length > 0);
});
```

- [ ] **Step 2: Run the test red** with the TS runner note, using `FILE=product-media-domain`; expected missing module/export failure.
- [ ] **Step 3: Implement the schema and pure rules.** Add `Product.status String @default("PUBLISHED")`, nullable `familyId`, `ProductFamily`, and `ProductMedia` with `kind`, `role`, `storageKey`, `url`, `posterUrl`, `alt`, `position`, `isCover`; relations use `onDelete: SetNull` for family and `Cascade` for product media. Keep `Product.image String`. Example rule signatures:

```ts
export type MediaKind = 'IMAGE' | 'VIDEO';
export type MediaRole = 'FLATLAY' | 'MODEL' | 'DETAIL';
export type PublishCandidate = {
  price: number; category: string; color: string;
  variants: { size: string; stock: number }[];
  media: { kind: MediaKind; isCover: boolean; url: string; posterUrl?: string | null }[];
};
export function normalizeColor(value: string) { return value.trim().toLocaleLowerCase('tr-TR'); }
export function getPublishErrors(product: PublishCandidate): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(product.price) || product.price <= 0) errors.push('price');
  if (!['ic-giyim', 'ev-giyim'].includes(product.category)) errors.push('category');
  if (!product.color.trim()) errors.push('color');
  if (!product.variants.length || product.variants.some((v) => !Number.isInteger(v.stock) || v.stock < 0)) errors.push('variants');
  const covers = product.media.filter((m) => m.isCover);
  if (covers.length !== 1 || !covers[0]?.url) errors.push('cover');
  if (covers[0]?.kind === 'VIDEO' && !covers[0].posterUrl) errors.push('poster');
  if (!product.media.some((m) => m.kind === 'IMAGE' && !!m.url || m.kind === 'VIDEO' && !!m.posterUrl)) errors.push('image');
  return errors;
}
```

Before changing `schema.prisma`, generate the current-schema baseline SQL with `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` and add it to the exact baseline path above using `apply_patch`. After adding the models, create the second additive SQL file with `Product.status` (`TEXT NOT NULL DEFAULT 'PUBLISHED'`), nullable `familyId`, `ProductFamily`, `ProductMedia`, indexes and foreign keys; no `DROP TABLE` or destructive column rewrite. On a disposable copy of an existing SQLite DB, mark the baseline as already applied with `npx prisma migrate resolve --applied 20260920000000_baseline`, then use `npx prisma migrate deploy` to apply the additive migration. Compare product count and IDs before/after; never test this against the user's live DB. `npx prisma generate` updates the local client. Do not run seed.
The additive migration must preserve existing rows; its structural shape is:

```sql
CREATE TABLE "ProductFamily" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE "Product" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "Product" ADD COLUMN "familyId" TEXT REFERENCES "ProductFamily"("id") ON DELETE SET NULL;
CREATE TABLE "ProductMedia" (
  "id" TEXT NOT NULL PRIMARY KEY, "productId" TEXT NOT NULL,
  "kind" TEXT NOT NULL, "role" TEXT NOT NULL, "storageKey" TEXT NOT NULL,
  "url" TEXT NOT NULL, "posterUrl" TEXT, "alt" TEXT NOT NULL,
  "position" INTEGER NOT NULL, "isCover" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);
CREATE INDEX "ProductMedia_productId_position_idx" ON "ProductMedia"("productId", "position");
```

Match Prisma-generated SQLite syntax and all schema fields exactly when writing the final SQL. A fresh empty test database receives both migrations; the disposable legacy DB resolves baseline then receives only the additive migration.
- [ ] **Step 4: Run the domain test, `npx prisma validate`, and `npx tsc --noEmit`;** expected all pass.
- [ ] **Step 5: Commit only the four task files** with message `feat: model product media and color families`.

### Task 2: Herkese açık ürün sorguları ve taslak yalıtımı

**Files:**
- Create: `src/lib/products/public-catalog.ts`
- Modify: `src/types/index.ts`
- Modify: `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`, `src/app/api/feed/google-merchant/route.ts`
- Modify: `src/app/urunler/[slug]/page.tsx`, `src/app/koleksiyon/[kategori]/[slug]/page.tsx`
- Create: `tests/public-catalog.test.ts`

**Interfaces:**
- Consumes Task 1 `Product.status`, media/family relations.
- Produces: `PUBLIC_PRODUCT_WHERE = { status: 'PUBLISHED' } as const`; `toPublicProduct(record): Product` with `media` sorted by `position` and `siblingColors: { id, slug, category, color, image }[]` from published family members; `publicFindBySlug(slug: string, repo): Promise<Product | null>` applying the same visibility guard. Extend the shared `Product` interface with optional `status`, `media`, and `siblingColors` plus explicit `ProductMedia`/`SiblingColor` interfaces. Keep legacy optional `images`/`video` for existing call sites until Task 7 removes synthetic fallbacks.

- [ ] **Step 1: Write failing tests** for public mapping and visibility:

```ts
test('public mapping excludes draft siblings and sorts real media', () => {
  const publishedFixture = { id: 'a', slug: 'siyah', status: 'PUBLISHED', image: '/siyah.webp', color: 'Siyah', category: 'ic-giyim' } as any;
  const draftSibling = { id: 'b', slug: 'taslak', status: 'DRAFT', image: '', color: 'Mavi', category: 'ic-giyim' } as any;
  const publishedSibling = { id: 'c', slug: 'beyaz', status: 'PUBLISHED', image: '/beyaz.webp', color: 'Beyaz', category: 'ic-giyim' } as any;
  const mediaAt0 = { id: 'm0', position: 0, kind: 'IMAGE', url: '/siyah.webp' } as any;
  const mediaAt2 = { id: 'm2', position: 2, kind: 'IMAGE', url: '/detay.webp' } as any;
  const result = toPublicProduct({ ...publishedFixture, media: [mediaAt2, mediaAt0], family: { products: [publishedFixture, draftSibling, publishedSibling] } });
  assert.deepEqual(result.media.map((m) => m.position), [0, 2]);
  assert.deepEqual(result.siblingColors.map((p) => p.slug), [publishedSibling.slug]);
});
test('published visibility is the shared query guard', () => {
  assert.deepEqual(PUBLIC_PRODUCT_WHERE, { status: 'PUBLISHED' });
});
```

Keep fixtures in the test file with all required Prisma scalar fields rather than mock product URLs.
- [ ] **Step 2: Run test red** using `FILE=public-catalog`; expected missing module/export.
- [ ] **Step 3: Implement one query policy.** All general list/detail/metadata/related/feed queries add `status: 'PUBLISHED'`. Detail routes return 404 for drafts. Include ordered media and only published family siblings; pass `toPublicProduct` to client components. Query helpers accept a narrow repository interface so visibility tests do not require a running DB. The feed still uses `Product.image` for a real URL and skips drafts:

```ts
const products = await prisma.product.findMany({ where: PUBLIC_PRODUCT_WHERE, include: { variants: true, media: { orderBy: { position: 'asc' } } } });
```

- [ ] **Step 4: Run test, TypeScript, and GET smoke checks** for a published and draft slug; expected published 200, draft 404, feed XML has no draft ID.
- [ ] **Step 5: Commit task files** with message `feat: hide drafts and expose verified product media`.

### Task 3: Güvenli medya doğrulama ve depolama

**Files:**
- Create: `src/lib/media/validate-upload.ts`, `src/lib/media/storage.ts`
- Modify: `package.json`, `package-lock.json` to add `@aws-sdk/client-s3` for the production adapter.
- Create: `tests/admin-upload.test.ts`

**Interfaces:**
- Produces: `validateUpload(file: File): Promise<{ kind: MediaKind; extension: string; contentType: string; bytes: Uint8Array }>`; `MediaStorage.put(bytes: Uint8Array, contentType: string): Promise<{ key: string; url: string }>`; `MediaStorage.delete(key: string): Promise<void>`; `uploadValidatedFile(file: File, storage: MediaStorage): Promise<{ key: string; url: string; kind: MediaKind }>` validates before storage. `put` generates an opaque random key server-side; no route trusts client filenames or arbitrary URLs.
- Production adapter uses S3-compatible settings `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL`. Development adapter writes under `public/uploads` only when `NODE_ENV !== 'production'`.

- [ ] **Step 1: Write failing validator/storage tests** with actual byte fixtures:

```ts
test('fake JPEG MIME with executable bytes never reaches storage', async () => {
  const fakeStorage = { putCalls: 0, async put() { this.putCalls++; return { key: 'x', url: '/x' }; }, async delete() {} };
  const file = new File([new Uint8Array([0x4d, 0x5a, 0x00])], 'look.jpg', { type: 'image/jpeg' });
  await assert.rejects(() => uploadValidatedFile(file, fakeStorage), /dosya türü/i);
  assert.equal(fakeStorage.putCalls, 0);
});
test('oversized image and video are rejected before put', async () => {
  const makeImageFile = (bytes: number) => new File([new Uint8Array(bytes)], 'x.jpg', { type: 'image/jpeg' });
  const makeVideoFile = (bytes: number) => new File([new Uint8Array(bytes)], 'x.mp4', { type: 'video/mp4' });
  await assert.rejects(() => validateUpload(makeImageFile(10 * 1024 * 1024 + 1)), /boyut/i);
  await assert.rejects(() => validateUpload(makeVideoFile(50 * 1024 * 1024 + 1)), /boyut/i);
});
```

Add the production-configuration test in the same file:

```ts
test('production storage has no local fallback', () => {
  assert.throws(() => createMediaStorage({ mode: 'production', s3: null }), { code: 'STORAGE_UNAVAILABLE' });
});
```

Export `createMediaStorage(config: { mode: 'production' | 'development'; s3: S3Config | null }): MediaStorage` from `storage.ts`; `S3Config` contains endpoint, bucket, region, accessKeyId, secretAccessKey, and publicBaseUrl as nonempty strings.
- [ ] **Step 2: Run red** using `FILE=admin-upload`; expected missing validator/export.
- [ ] **Step 3: Implement bounded stream reading.** Check declared `File.size` first; read the stream with a hard cap rather than unbounded `arrayBuffer()`, then verify byte signatures for JPEG/PNG/WebP/MP4/WebM and allowed MIME. Reject SVG. Implement `uploadValidatedFile` so no storage write occurs before validation. Use random UUID keys and `@aws-sdk/client-s3` with configured `endpoint` and `forcePathStyle` for the production S3-compatible adapter; use a private write request and public read base URL, with no silent local fallback. Route integration is Task 4, after a draft product exists.
- [ ] **Step 4: Run unit tests and TypeScript;** expected validation success for real signatures, no stored bytes on invalid files, and explicit storage-unavailable error in production without S3 configuration.
- [ ] **Step 5: Commit task files** with message `feat: validate and persist admin product media safely`.

### Task 4: Yönetici ürün, renk ailesi ve medya API'si

**Files:**
- Modify: `src/app/api/admin/products/route.ts`
- Modify: `src/app/api/admin/upload/route.ts`
- Create: `src/app/api/admin/products/[id]/route.ts`, `src/app/api/admin/products/[id]/media/route.ts`, `src/app/api/admin/products/[id]/publish/route.ts`, `src/app/api/admin/product-families/route.ts`
- Create: `src/lib/admin/product-editor-service.ts`
- Create: `tests/helpers/in-memory-product-repo.ts`
- Create: `tests/admin-product-editor.test.ts`

**Interfaces:**
- Consumes Tasks 1-3 domain rules and storage keys.
- Produces: `createDraft(input: DraftInput, repo: ProductRepository): Promise<Product>`; `saveProduct(input: ProductUpdate, repo): Promise<Product>`; `attachMedia(input: { productId: string; file: File; role: MediaRole; alt: string; posterMediaId?: string; isCover?: boolean }, repo, storage: MediaStorage): Promise<ProductMedia>`; `setCover(productId: string, mediaId: string, repo): Promise<void>`; `saveMediaOrder(input: { productId: string; mediaId: string; position: number }, repo): Promise<void>`; `deleteMedia(input: { productId: string; mediaId: string }, repo, storage): Promise<void>`; `setFamily(input: { productId: string; familyId: string }, repo): Promise<Product>`; `publishProduct(id: string, repo): Promise<Product>`.
- `ProductRepository` is an injected Prisma-backed interface; `tests/helpers/in-memory-product-repo.ts` exports `makeMemoryProductRepo(initialProducts?: Product[]): ProductRepository & { products: Map<string, Product>; familyWrites: unknown[] }`. Routes call services only after `getCurrentUser()` confirms ADMIN.

- [ ] **Step 1: Write failing service/API tests** for the Review Focus cases:

```ts
test('duplicate normalized color leaves family unchanged', async () => {
  const repo = makeMemoryProductRepo([{ id: 'a', color: 'Siyah', familyId: 'f', category: 'ic-giyim' }, { id: 'b', color: ' siyah ', category: 'ic-giyim' }] as Product[]);
  await assert.rejects(() => setFamily({ productId: 'b', familyId: 'f' }, repo), { code: 'COLOR_CONFLICT' });
  assert.equal(repo.familyWrites.length, 0);
});
test('missing poster/cover cannot publish', async () => {
  const repo = makeMemoryProductRepo([{ id: 'draft-video', status: 'DRAFT', price: 590, category: 'ic-giyim', color: 'Siyah', variants: [{ size: 'S', stock: 2 }], media: [{ id: 'video', kind: 'VIDEO', url: '/v.mp4', posterUrl: null, isCover: true }] }] as Product[]);
  await assert.rejects(() => publishProduct('draft-video', repo), { code: 'INVALID_PUBLISH' });
  assert.equal(repo.products.get('draft-video')?.status, 'DRAFT');
});
test('foreign media id cannot be changed and sole published cover cannot be deleted', async () => {
  const repo = makeMemoryProductRepo([{ id: 'a', status: 'PUBLISHED', media: [{ id: 'sole-cover', isCover: true }] }, { id: 'b', media: [{ id: 'belongs-to-b' }] }] as Product[]);
  const storage = { async put() { return { key: 'x', url: '/x' }; }, async delete() {} };
  await assert.rejects(() => saveMediaOrder({ productId: 'a', mediaId: 'belongs-to-b', position: 0 }, repo), { code: 'NOT_FOUND' });
  await assert.rejects(() => deleteMedia({ productId: 'a', mediaId: 'belongs-to-b' }, repo, storage), { code: 'NOT_FOUND' });
  await assert.rejects(() => deleteMedia({ productId: 'a', mediaId: 'sole-cover' }, repo, storage), { code: 'COVER_REQUIRED' });
});
```

Add these concrete cases in the same test file (the route authorization test may use a stubbed `getCurrentUser` boundary):

```ts
test('invalid draft price, stock and category do not write', async () => {
  const repo = makeMemoryProductRepo();
  const input = { slug: 'x', name: 'X', color: 'Siyah', category: 'yanlis', price: -1, variants: [{ size: 'S', stock: -2 }] };
  await assert.rejects(() => createDraft(input, repo), { code: 'INVALID_PRODUCT' });
  assert.equal(repo.products.size, 0);
});
test('customer cannot enter an admin mutation', async () => {
  const response = await invokeAdminProductPost({ role: 'CUSTOMER', body: {} });
  assert.equal(response.status, 403);
});
test('two covers are refused without changing the original cover', async () => {
  const repo = makeMemoryProductRepo([{ id: 'a', status: 'PUBLISHED', media: [{ id: 'first', isCover: true }, { id: 'second', isCover: false }] }] as Product[]);
  await assert.rejects(() => setCover('a', 'missing', repo), { code: 'NOT_FOUND' });
  assert.equal(repo.products.get('a')?.media?.filter((item) => item.isCover).length, 1);
});
```

`invokeAdminProductPost` is a test helper in `tests/admin-product-editor.test.ts` that calls the route with stubbed auth; it does not bypass the actual route guard. `setCover` sets exactly one cover in a transaction, never toggles two flags independently.
- [ ] **Step 2: Run red** using `FILE=admin-product-editor`; expected missing service/functions.
- [ ] **Step 3: Implement transactional mutations and thin routes.** `POST /api/admin/products` creates `DRAFT` with `image: ''` and validated scalar/stock fields. `PATCH /api/admin/products/[id]` edits scalar/stock fields. `/media` accepts multipart `file`, role, alt and optional poster media ID, calls `attachMedia`, reorders/sets cover/deletes with product ownership checks. `attachMedia` validates the existing image poster belongs to that product before video storage; if DB creation fails after `put`, it calls `storage.delete(key)`. `/publish` validates `getPublishErrors`, sets `PUBLISHED`, and syncs `Product.image` in one DB transaction. `/product-families` creates/lists family and binds a product after `assertFamilyCandidate`. Replace old `/api/admin/upload` with an ADMIN-checked 410 response directing the UI to product-bound `/media`; Task 5 removes the old form call. Map domain errors to 400/404/409, unexpected failure to 5xx; no response claims success before commit. Do not deploy between Tasks 4 and 5.
- [ ] **Step 4: Run tests, TypeScript and API role/invalid-input matrix;** expected all green and no partial writes.
- [ ] **Step 5: Commit task files** with message `feat: manage draft products media and color families`.

### Task 5: Yönetici ürün düzenleyicisi

**Files:**
- Create: `src/components/admin/ProductEditor.tsx`
- Modify: `src/app/yonetim/page.tsx`, `src/app/globals.css`
- Create: `tests/admin-product-editor-ui.test.tsx`

**Interfaces:**
- Consumes Task 4 endpoints and returned `Product` with `media`, `family`, `variants`.
- Produces: `<ProductEditor productId?: string onSaved(): void onClose(): void />`; `editorReducer(state, action)` for editing/saving/error transitions. Component owns pending/error/success state but never stores prices or stock as client authority.

- [ ] **Step 1: Write failing rendered/interaction tests**:

```tsx
test('new editor says draft and exposes media role, poster and publish controls', () => {
  const html = renderToStaticMarkup(<ProductEditor onSaved={() => {}} onClose={() => {}} />);
  assert.match(html, /Taslak oluştur/);
  assert.match(html, /Düz çekim|Manken|Detay/);
  assert.match(html, /Kapak/);
  assert.match(html, /Yayınla/);
});
test('save failure returns to editable state with retry message', () => {
  const state = editorReducer({ phase: 'saving', error: null }, { type: 'SAVE_FAILED', message: 'Yükleme başarısız' });
  assert.deepEqual(state, { phase: 'editing', error: 'Yükleme başarısız' });
});
```

Use the repo's existing React render/test utilities; if DOM interaction tooling is absent, test the request/state reducer as a pure function in the same module instead of adding a large dependency.
- [ ] **Step 2: Run red** using `FILE=admin-product-editor-ui`; expected missing component.
- [ ] **Step 3: Implement a focused editor.** Existing admin Products tab opens it for create and edit. Sections: base fields/stock, ordered media list with upload/progress/role/alt/poster/cover, family search/link, real card preview, draft save/publish. Show the media and publish controls before first save but disable them with an explanation until the draft has an ID. Label every input; disable only the current mutation, explain errors inline, prevent duplicate submit, reload server record after success. Remove fixed default product image from new-product state. Keep existing stock/price edits operational.
- [ ] **Step 4: Run UI tests, TypeScript and browser checks** for create/edit, invalid file, interrupted upload, draft, publish, keyboard/mobile modal focus; expected explicit error/retry and no false success.
- [ ] **Step 5: Commit task files** with message `feat: add product media editor to admin panel`.

### Task 6: Koleksiyon kartlarında gerçek karma medya

**Files:**
- Create: `src/components/collection/CollectionProductCard.tsx`
- Modify: `src/app/koleksiyon/CollectionClient.tsx`, `src/app/globals.css`
- Create: `tests/collection-product-media.test.tsx`

**Interfaces:**
- Consumes `toPublicProduct` media/sibling fields and `selectCardMedia` from Tasks 1-2.
- Produces: `<CollectionProductCard product={product} layout={columns} onWishlist={handleWishlist} onQuickAdd={handleQuickAdd} />` where both callbacks accept a `productId: string`; `CollectionClient` adapts its verified actions. Export pure `shouldAutoplayCardVideo(reducedMotion: boolean, interaction: 'hover' | 'tap'): boolean` (true only for hover without reduced motion); mobile tap is an explicit user action, not autoplay.

- [ ] **Step 1: Write failing card tests**:

```tsx
test('one product with three media remains one article and one price', () => {
  const product = { id: 'p1', slug: 'siyah-crop', name: 'Siyah Crop', price: 590, color: 'Siyah', category: 'ic-giyim', image: '/media/flat.webp', description: '', media: [
    { id: 'm1', kind: 'IMAGE', role: 'FLATLAY', url: '/media/flat.webp', alt: 'Düz çekim', position: 0, isCover: true },
    { id: 'm2', kind: 'IMAGE', role: 'MODEL', url: '/media/model.webp', alt: 'Manken', position: 1, isCover: false },
    { id: 'm3', kind: 'VIDEO', role: 'MODEL', url: '/media/clip.mp4', posterUrl: '/media/poster.webp', alt: 'Ürün videosu', position: 2, isCover: false },
  ] } as Product;
  const html = renderToStaticMarkup(<CollectionProductCard product={product} layout={4} onWishlist={() => {}} onQuickAdd={() => {}} />);
  assert.equal((html.match(/<article/g) || []).length, 1);
  assert.equal((html.match(/₺/g) || []).length, 1);
  assert.match(html, /poster="\/media\/poster.webp"/);
});
test('unlinked or draft sibling makes no color choice', () => {
  const product = { id: 'p1', slug: 'siyah-crop', name: 'Siyah Crop', price: 590, color: 'Siyah', category: 'ic-giyim', image: '/media/flat.webp', description: '', siblingColors: [] } as Product;
  const html = renderToStaticMarkup(<CollectionProductCard product={product} layout={4} onWishlist={() => {}} onQuickAdd={() => {}} />);
  assert.doesNotMatch(html, /collection-color-link/);
});
```

Add test for legacy `image` fallback and `prefers-reduced-motion` behavior through the pure play-policy helper (`shouldAutoplayCardVideo(reducedMotion, interaction)`).
- [ ] **Step 2: Run red** using `FILE=collection-product-media`; expected missing component/helper.
- [ ] **Step 3: Extract and implement the card without changing product count.** Cover/secondary come only from that product; hover photo transition works when present. Video uses poster, `preload="none"`, muted `playsInline`, explicit play/pause button with accessible name, and a single active-video coordinator. On hover it may play only when reduced motion is off; on mobile explicit tap is required. Stop on exit/hidden tab. Published siblings render as links to canonical URLs with text color names, not invented swatch colors. Keep favoriting/quick-add separate keyboard targets. Maintain existing 2/4/6 layouts.
- [ ] **Step 4: Run card tests, existing collection tests, TypeScript and browser checks** at 320/375/768/1024/1440 px and reduced motion; expected one card per product and no autoplay under reduced motion.
- [ ] **Step 5: Commit task files** with message `feat: show authentic mixed media on collection cards`.

### Task 7: Ürün detayında medya ve gerçek renk bağlantıları

**Files:**
- Create: `src/components/product/ProductColorLinks.tsx`
- Modify: `src/app/urunler/[slug]/ProductDetailClient.tsx`, `src/app/urunler/[slug]/page.tsx`, `src/app/koleksiyon/[kategori]/[slug]/page.tsx`
- Create: `tests/product-color-media.test.tsx`

**Interfaces:**
- Consumes Task 2 `toPublicProduct`, `media`, `siblingColors` and existing detail gallery props.
- Produces: `<ProductColorLinks current={product} siblings={product.siblingColors} />` with actual canonical links; `toGalleryFrames(product: Product): GalleryFrame[]` sorted by media position, falling back to the same product's legacy `image` only when no media exists.

- [ ] **Step 1: Write failing detail tests**:

```tsx
test('only published real colors link to their own product route', () => {
  const black = { id: 'black', slug: 'siyah-crop', category: 'ic-giyim', color: 'Siyah', image: '/siyah.webp' } as Product;
  const white = { id: 'white', slug: 'beyaz-crop', category: 'ic-giyim', color: 'Beyaz', image: '/beyaz.webp' } as SiblingColor;
  const html = renderToStaticMarkup(<ProductColorLinks current={black} siblings={[white]} />);
  assert.match(html, /href="\/koleksiyon\/ic-giyim\/beyaz-crop"/);
  assert.doesNotMatch(html, /stokta/i);
});
test('legacy product with no media keeps its single image gallery', () => {
  assert.deepEqual(toGalleryFrames({ image: '/assets/lace.webp', media: [] }), ['/assets/lace.webp']);
});
```

Define `toGalleryFrames` as a pure export in the component or media-domain module before using it in tests.
- [ ] **Step 2: Run red** using `FILE=product-color-media`; expected missing component/export.
- [ ] **Step 3: Use sorted real media in both detail routes** and preserve current gallery/size/cart functionality. Remove slug-based fabricated gallery frames; legacy fallback is only the same product's real `image`. Add color links adjacent to current color; unavailable/draft siblings never appear. Product structured data and metadata use the canonical `Product.image` poster. Video frames use controls and poster; no unsupported auto-play.
- [ ] **Step 4: Run detail tests, existing lower-content tests, TypeScript, route smoke checks;** expected draft detail 404 and correct color target.
- [ ] **Step 5: Commit task files** with message `feat: connect product colors and gallery media`.

### Task 8: Sözleşme belgeleri ve uçtan uca kabul

**Files:**
- Modify: `DESIGN.md`, `docs/pages/ADMIN.md`, `docs/pages/STOREFRONT.md`, `docs/API.md`, `docs/DATA.md`, `docs/SECURITY.md`, `docs/QA.md`
- Modify: `README.md` for development and required production storage environment setup.
- Create: `tests/product-media-flow.test.ts`

**Interfaces:**
- Consumes Tasks 1-7; no new runtime API.
- Produces: documented storage configuration, admin workflow, public behavior and known blockers.

- [ ] **Step 1: Write failing acceptance test** exercising draft → media → cover → family → publish → public mapping with an isolated test repository/storage fake:

```ts
test('product stays private until real cover and publish, then exposes linked color', async () => {
  const repo = makeMemoryProductRepo([{ id: 'family-member', slug: 'beyaz-crop', name: 'Beyaz Crop', status: 'PUBLISHED', category: 'ic-giyim', color: 'Beyaz', familyId: 'family-1', image: '/beyaz.webp', price: 590, variants: [{ size: 'S', stock: 2 }], media: [] }] as Product[]);
  const storage = { async put() { return { key: 'media/flat.webp', url: '/media/flat.webp' }; }, async delete() {} };
  const input = { slug: 'siyah-crop', name: 'Siyah Crop', category: 'ic-giyim', color: 'Siyah', price: 590, variants: [{ size: 'S', stock: 2 }] };
  const draft = await createDraft(input, repo);
  assert.equal(await publicFindBySlug(draft.slug, repo), null);
  const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'flat.jpg', { type: 'image/jpeg' });
  const media = await attachMedia({ productId: draft.id, file: jpeg, role: 'FLATLAY', alt: 'Siyah Crop düz çekim' }, repo, storage);
  await setCover(draft.id, media.id, repo);
  await setFamily({ productId: draft.id, familyId: 'family-1' }, repo);
  await publishProduct(draft.id, repo);
  const publicProduct = await publicFindBySlug(draft.slug, repo);
  assert.equal(publicProduct?.status, 'PUBLISHED');
  assert.deepEqual(publicProduct?.siblingColors.map((item) => item.slug), ['beyaz-crop']);
});
```

Import `makeMemoryProductRepo` from Task 4's test helper and service functions from Tasks 2 and 4. The helper must seed the family and permit creation within that family, matching the production repository interface. Add a genuine valid image fixture for the validator's full JPEG signature requirements if the minimal four-byte sequence is intentionally rejected.
- [ ] **Step 2: Run red** using `FILE=product-media-flow`; expected failure until the integrated path and helper exports are connected.
- [ ] **Step 3: Finish integration and update the listed docs** with exact media limits, production S3 settings, draft visibility, family semantics, video behavior, security and QA outcomes. Do not mark unrelated payment/admin security issues resolved.
- [ ] **Step 4: Run full verification:** all new and existing TSX tests with the runner note, `node --test tests/*.test.mjs`, `npx prisma validate`, `npx tsc --noEmit`, `npm run build`, then browser acceptance at desktop/mobile and reduced motion. If a command fails, record its exact failure and do not claim completion.
- [ ] **Step 5: Commit only the integration tests/docs/final fixes** with message `test: verify product media publishing flow`.

## Handoff

Complete Tasks 1-8 in order. Keep all unrelated dirty files untouched. Before merging or going live, verify permanent object storage credentials and the independent security gates in `docs/QA.md`; this feature alone does not authorize production sales.
