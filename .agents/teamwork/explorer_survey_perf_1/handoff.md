# Handoff Report — Storefront Performance & Caching Survey

**Agent:** `explorer_survey_perf_1`  
**Parent Orchestrator:** `11ad4927-cc30-4799-8f3d-386da9a25a72`  
**Milestone:** `survey_perf_caching`  
**Report Artifact:** `survey_report.md`  

---

## 1. Observation

1. **Uncommitted Workspace Changes (`git status --short`):**
   - 39 modified files and 20 untracked files/directories exist across the repository.
   - Significant uncommitted work includes:
     - Root: `next.config.mjs`, `package.json`, `tsconfig.json`, `prisma/schema.prisma`
     - Storefront: `src/app/(anasayfa)/page.tsx` (moved from `src/app/page.tsx`), `src/app/urun/[slug]/ProductDetailClient.tsx`, `src/components/collection/CollectionProductCard.tsx`, `src/components/product/PriceTag.tsx`
     - Assets: `public/assets/home/*.webp`, `scripts/optimize-home-images.mjs`
     - Caching & Catalog: `src/lib/products/catalog-cache.ts`, `src/lib/products/public-catalog.ts`, `src/lib/products/load-collection.ts`
     - Admin: Product editor revamp (`src/app/yonetim/*`, `src/lib/admin/*`, `src/styles/pages/admin-product-editor.css`)
     - Migrations: `prisma/migrations/20261014000000_product_commerce_fields/`

2. **Route Segment Caching & Dynamic Settings:**
   - In `src/app/(anasayfa)/page.tsx:15`: `export const dynamic = 'force-dynamic';`
   - In `src/app/yeni-gelenler/page.tsx:8`: `export const dynamic = 'force-dynamic';`
   - In `src/app/bulunamadi/page.tsx:7`: `export const dynamic = 'force-static';`
   - In `src/app/[kategori]/page.tsx`, `src/app/[kategori]/[altKategori]/page.tsx`, and `src/app/urun/[slug]/page.tsx`: no `generateStaticParams` and no `revalidate`.
   - Grep across the entire codebase for `export const revalidate` yielded **0 results**.

3. **Data Caching & Invalidation:**
   - In `src/lib/settings/server.ts:21`: `unstable_cache(readStoreSettings, ['store-settings'], { tags: ['store-settings'] })`
   - In `src/lib/products/load-collection.ts:84-93`: `unstable_cache(..., ['home-collection'], { revalidate: 60, tags: ['catalog'] })`
   - In `src/lib/products/load-collection.ts:62`: `loadCollection()` directly runs `prisma.product.findMany` with no cross-request caching.
   - In `src/app/api/admin/categories/route.ts`: POST, PATCH, and DELETE handlers do not call any revalidation functions (`refreshCatalogCache`, `revalidateTag`, or `revalidatePath` are completely absent).

4. **Image Usage & Delivery:**
   - In `src/app/(anasayfa)/page.tsx:75`: Hero model image has `priority={true}`, `sizes={TALL_FRAME_SIZES}` (`'(max-width: 900px) 200vw, 65vw'`).
   - In `src/components/collection/CollectionProductCard.tsx:43-47`: `FRAME_SIZES` uses `'(max-width: 600px) 200vw, 100vw'`, requesting up to 1920px images on small mobile screens.
   - In `src/app/canta/page.tsx:206`:
     ```html
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={item.image} alt="" loading="lazy" decoding="async" />
     ```
     Plain `<img>` tag without `next/image`, lacking dimensions (CLS risk), and with empty alt text.
   - In `src/app/odeme/page.tsx:389`:
     ```html
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={item.image} alt="" width={64} height={96} loading="lazy" decoding="async" />
     ```
     Plain `<img>` tag without modern format conversion (AVIF/WebP), and empty alt text.
   - In `src/app/_home/HomeProductGrid.tsx:49`: `<Image src={p.image} alt="" ... />` (empty alt text).
   - In `src/app/(anasayfa)/page.tsx:231, 235`: brand story `<Image alt="" ... />` (empty alt text).

5. **Static Headers & Private Route Protection:**
   - In `next.config.mjs:41-43`:
     ```javascript
     async headers() {
       return [{ source: '/:path*', headers: securityHeaders() }];
     }
     ```
     No custom `Cache-Control` header for `/fonts/*` or `/assets/*`.
   - In `src/middleware.ts:83-97`: `privateHeaders` (setting `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`) is only applied to `/yonetim*`, `/api/admin*`, and `/yonetim/giris`. It is not applied to `/hesabim`, `/siparislerim`, `/canta`, `/odeme`, or customer APIs (`/api/auth/*`, `/api/cart/*`).
   - In `src/app/api/auth/me/route.ts`: returns sensitive customer profile, addresses, and order history with direct `NextResponse.json` without `Cache-Control: private, no-store`.

6. **TypeScript & Test Execution:**
   - Command `npx tsc --noEmit` exited with code 0 (clean compilation).
   - Command `npm test` passed completely: 282/282 tests green (0 failures, 0 skipped).

---

## 2. Logic Chain

1. **Premise:** The acceptance criteria demand mobile Lighthouse Performance ≥ 90 on homepage, category, and product detail, CLS ≤ 0.1, LCP priority, and fast image delivery.
2. **From Obs 4:** The responsive `sizes` attribute on collection cards specifies `200vw` for mobile viewports (`(max-width: 600px) 200vw, 100vw`). On a phone with 390px width and DPR=3, this calculates to ~2340px, causing Next.js to serve 1600px or 1920px image variants instead of 480px–640px. This severely inflates mobile network payload and degrades LCP.
3. **From Obs 4:** Cart (`canta`) and checkout (`odeme`) pages use raw `<img>` tags, skipping Next.js AVIF/WebP optimization and device-width resizing. In `canta`, missing width/height attributes present layout shift (CLS) hazards.
4. **From Obs 2 & 3:** Vitrin pages (`(anasayfa)`, `yeni-gelenler`, `[kategori]`, `[kategori]/[altKategori]`, `urun/[slug]`) execute dynamic SSR on every visitor request. Category pages call `loadCollection()` directly without `unstable_cache`, repeatedly hitting PostgreSQL with `prisma.product.findMany`.
5. **From Obs 5:** Static assets (`public/fonts/web/*.woff2` and `public/assets/home/*.webp`) are served without `Cache-Control: public, max-age=31536000, immutable`. Browsers must validate them on every hit, adding unnecessary network round trips.
6. **From Obs 5:** Customer private pages and auth APIs lack `Cache-Control: private, no-store` headers, violating R2 ("Kişiye özel ve yönetim yanıtları asla paylaşılan önbelleğe girmemeli").
7. **From Obs 3:** When categories are updated in admin (`/api/admin/categories`), no cache revalidation is triggered, meaning any future caching of category trees or pages would serve stale data indefinitely until restart.

---

## 3. Caveats

- **Lighthouse live measurement:** Lighthouse mobile audits were not executed during this survey turn because the application was not running in production build (`npm run build && npm start`) during read-only investigation. Exact score tables should be recorded by the builder agent immediately after build and start.
- **Vercel edge deployment vs Local:** In local development, `unstable_cache` behaves in-memory/file-based; on Vercel deployment, it utilizes the Data Cache / Vercel KV / edge infrastructure.
- **Admin overhaul in progress:** The product editor in `/yonetim` has significant uncommitted changes. Performance adjustments to admin code must coordinate with that working state.

---

## 4. Conclusion

The architecture has solid foundations (WOFF2 font subsetting, `DeferredOverlays` code-splitting, `next.config.mjs` image quality and AVIF/WebP formats), but suffers from four critical performance and caching bottlenecks:
1. **Oversized mobile image delivery** due to `200vw` sizes rules in `CollectionProductCard` and homepage editoryal slots.
2. **Bypassed image pipeline** on cart and checkout pages (raw `<img>` tags).
3. **Absence of caching on catalog queries** (`loadCollection`, `loadProduct`) and lack of long-lived cache headers on static assets (`/fonts/`, `/assets/`).
4. **Missing cache isolation** (`no-store`) on customer private routes/APIs, and **missing revalidation** when categories change in admin.

A detailed analysis and prioritized actionable roadmap has been written to `survey_report.md`.

---

## 5. Verification Method

To independently verify the observations:

1. **Verify TypeScript compilation:**
   ```bash
   npx tsc --noEmit
   ```
   *Expected result: 0 errors.*

2. **Verify uncommitted changes:**
   ```bash
   git status --short
   ```
   *Verify modified files match Section 1.1.*

3. **Verify absent route revalidate and presence of dynamic configs:**
   ```bash
   # Confirm no route revalidate exists
   git grep "export const revalidate" src/
   # Confirm force-dynamic on homepage
   git grep "export const dynamic = 'force-dynamic'" src/app/\(anasayfa\)/page.tsx
   ```

4. **Verify raw `<img>` tags in cart and checkout:**
   ```bash
   git grep -n "<img" src/app/canta/ src/app/odeme/
   ```
   *Lines: `src/app/canta/page.tsx:206`, `src/app/odeme/page.tsx:389`.*

5. **Verify lack of revalidation in admin categories:**
   Inspect `src/app/api/admin/categories/route.ts` to confirm no calls to `revalidateTag`, `revalidatePath`, or `refreshCatalogCache`.
