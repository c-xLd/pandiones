# Project: Pandiones E-Commerce Performance, Caching, SEO, Google Merchant Feed & Admin Panel Controls

## Architecture
Pandiones is a modern e-commerce platform built on Next.js 15 (App Router), React 19, Prisma ORM, and PostgreSQL, deployed on Vercel (`https://pandiones.vercel.app`).

### Layer Boundaries & Data Flow
1. **Database & Schema Layer**: PostgreSQL managed via Prisma (`prisma/schema.prisma`). All migrations in `prisma/migrations` are additive and non-destructive.
2. **Storefront & UI Layer**: Located in `src/app/(anasayfa)/`, `src/app/[kategori]/`, `src/app/urun/[slug]/`, `src/app/canta/`, `src/app/odeme/`, `src/components/`. Consumes cached catalog and settings services.
3. **Caching & Revalidation Layer**: `unstable_cache` with tag-based invalidation (`store-settings`, `catalog`, `categories`, `product-[slug]`) and path invalidation (`revalidatePath`).
4. **SEO & Feed Engine**: Metadata generation (`generateMetadata`), dynamic `robots.txt` (`src/app/robots.ts`), dynamic `sitemap.xml` (`src/app/sitemap.ts`), schema.org JSON-LD (Product, Offer, BreadcrumbList, Organization, WebSite), and Google Merchant XML feed (`src/app/api/feed/google-merchant/route.ts`).
5. **Administration & Security Layer**: `/yonetim` and `/api/admin/*`. Multi-tier security: session-based auth, TOTP 2FA, step-up reauthentication for critical actions, CSRF checks (`isCrossSiteMutation`), strict `AuditLog` recording.
6. **E2E Testing & Quality Gate Layer**: Automated tests (`tests/`), TypeScript compiler (`npx tsc --noEmit`), Lighthouse performance audits, DevTools network/DOM verification.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1: Mobile Responsive Image Sizing Fix | Fix `200vw` sizing in `CollectionProductCard` and home frames to prevent downloading 1920px images on 390px mobile screens. | M1 | Survey (perf) & R1 |
| 2 | F2: Cart & Checkout Image Optimization | Replace raw `<img>` in `canta/page.tsx` and `odeme/page.tsx` with `next/image` to prevent CLS and enable modern format compression. | M1 | Survey (perf) & R1 |
| 3 | F3: Storefront Image Alt Text Enrichment | Replace empty `alt=""` with descriptive Turkish alt text in `HomeProductGrid.tsx`, brand story, cart, and checkout. | M1 | Survey (perf) & R1 |
| 4 | F4: Static Asset Immutable Cache Headers | Configure `next.config.mjs` with `Cache-Control: public, max-age=31536000, immutable` for `/fonts/*` and `/assets/*`. | M1 | Survey (perf) & R1/R2 |
| 5 | F5: Storefront Bundle & CSS Optimization | Maintain modular CSS and dynamic overlay imports, ensuring low LCP and zero CLS across devices. | M1 | Survey (perf) & R1 |
| 6 | F6: Private Customer Data Isolation | Protect `/hesabim`, `/siparislerim`, `/canta`, `/odeme`, and `/api/auth/*` with `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow`. | M2 | Survey (perf) & R2 |
| 7 | F7: Storefront Data Caching (`unstable_cache`) | Wrap catalog, category tree, and product lookups with `unstable_cache` and granular tag invalidation. | M2 | Survey (perf) & R2 |
| 8 | F8: Admin Category Mutation Revalidation | Connect category create, update, reorder, and delete handlers to `revalidateTag('catalog')`, `revalidateTag('categories')`, and `revalidatePath`. | M2 | Survey (perf) & R2 |
| 9 | F9: Admin Product Mutation Revalidation | Connect product create, update, and delete to `refreshCatalogCache()` and `revalidatePath('/urun/[slug]')`. | M2 | Survey (perf) & R2 |
| 10 | F10: Additive Schema Migration for SEO/Feed | Add non-destructive fields to `StoreSettings`, `Product`, `Category`, and create `PageSeoOverride` model in Prisma. | M3 | Survey (spec/seo) & R3/R5 |
| 11 | F11: Root Layout SEO, Open Graph & JSON-LD | Define `metadataBase`, site-wide Open Graph/Twitter tags, and `Organization`/`WebSite` JSON-LD in `layout.tsx`. | M3 | Survey (seo) & R3 |
| 12 | F12: Dynamic Product JSON-LD & Canonical | Dynamically compute `offers.availability` (`InStock` vs `OutOfStock` based on real stock) and inject product canonical URL. | M3 | Survey (seo) & R3/R7 |
| 13 | F13: Category & Subcategory BreadcrumbList JSON-LD | Emit valid `BreadcrumbList` schema and canonical/OG tags for category views. | M3 | Survey (seo) & R3 |
| 14 | F14: Dynamic Robots Engine with Admin Toggle | Implement dynamic `robots.ts` reading `seoRobotsIndexing` (disallow all if false; disallow private routes if true). | M3 | Survey (seo) & R3/R5 |
| 15 | F15: Dynamic Sitemap Engine | Cleanse `sitemap.ts` (remove `/favorilerim`, add static guide routes, respect published and noindex flags). | M3 | Survey (seo) & R3 |
| 16 | F16: Private Storefront Routes Noindex Tagging | Add `robots: { index: false, follow: false }` to `/sepet`, `/canta`, `/odeme`, `/hesabim`, `/siparislerim`, `/yonetim`. | M3 | Survey (seo) & R3 |
| 17 | F17: Google Merchant XML Variant Feed Engine | Overhaul `/api/feed/google-merchant` with variant `<item>` nodes, `item_group_id`, `g:size`, `g:color`, `g:shipping`, `g:gtin`/`g:mpn`, `g:sale_price`. | M4 | Survey (spec/seo) & R4 |
| 18 | F18: Google Merchant Center Toggle & 404 | Return HTTP 404 when `merchantFeedEnabled = false` in admin settings. | M4 | Survey (spec/seo) & R4 |
| 19 | F19: Merchant Product Eligibility & Exclusion Filter | Exclude draft, out-of-spec, and `excludeFromFeed = true` products from the feed. | M4 | Survey (spec/seo) & R4 |
| 20 | F20: Admin Cache Purge API (`/api/admin/cache/purge`) | On-demand cache purge endpoint with step-up auth, admin guard, and structured `AuditLog` entry. | M5 | Survey (spec) & R5 |
| 21 | F21: Admin SEO & Merchant Health Report API | Endpoint (`/api/admin/health-report`) returning real diagnostics (missing meta, missing alt, oversized images, feed disqualified products). Zero mock data. | M5 | Survey (spec) & R5 |
| 22 | F22: Admin SettingsTab Controls Expansion | UI forms for site SEO, robots toggle, Merchant feed toggle/brand, GSC/GA4 verification, image quality, cache purge button. | M5 | Survey (spec) & R5 |
| 23 | F23: Admin Product & Category Editor SEO/Feed Fields | Form inputs for `seoTitle`, `seoDescription`, `canonicalUrl`, `noindex`, `excludeFromFeed`. | M5 | Survey (spec) & R5 |
| 24 | F24: GA4 Analytics Dynamic Injection & CSP Policy | Load GA4 script only when ID configured; update `headers.mjs` CSP for Google domains. | M5 | Survey (spec) & R5 |
| 25 | F25: E2E Test Suite (Tiers 1-4) | Systematic 4-tier opaque-box test suite covering all features, boundaries, combinations, and real-world workflows. | E2E Track | ORIGINAL_REQUEST & Dual Track |
| 26 | F26: Quality Gates Pass | 100% test pass on existing 282 + new test suite, zero TypeScript errors, brand compliance green, successful `npm run build`. | M6 | Acceptance Criteria & QA |
| 27 | F27: Tier 5 Adversarial Coverage Hardening | White-box stress testing and adversarial edge-case verification by Challengers. | M6 | Project Pattern Phase 2 |
| 28 | F28: Production Deployment & Live Verification | Execute migration deploy, verify live on `https://pandiones.vercel.app` with DevTools screenshots and zero mock checks. | M7 | R6, R7 & Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Storefront Performance & Asset Delivery | F1, F2, F3, F4, F5 | none | PLANNED |
| M2 | Caching Architecture & Private Data Isolation | F6, F7, F8, F9 | M1 | PLANNED |
| M3 | Database Schema & SEO Engine (Metadata, JSON-LD, Robots, Sitemap) | F10, F11, F12, F13, F14, F15, F16 | none | PLANNED |
| M4 | Google Merchant Center XML Feed Engine | F17, F18, F19 | M3 | PLANNED |
| M5 | Admin Panel Controls, Health Diagnostics & Analytics | F20, F21, F22, F23, F24 | M2, M3, M4 | PLANNED |
| M6 | E2E Test Suite Pass (Tiers 1-4) & Adversarial Coverage Hardening (Tier 5) | F26, F27 | M1, M2, M3, M4, M5, E2E Track | PLANNED |
| M7 | Production Build, Migration Safety, Vercel Deployment & Live Verification | F28 | M6 | PLANNED |

*Parallel Track*:
| Track | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| E2E | E2E Testing Orchestrator (Opaque-box Tiers 1-4) | F25 | none | PLANNED |

---

## Interface Contracts

### 1. StoreSettings & Revalidation Interface
```ts
// src/lib/settings/shared.ts
export interface StoreSettingsValues {
  // Existing fields
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  instagramUrl: string;
  freeShippingThreshold: number;
  lowStockThreshold: number;
  announcementEnabled: boolean;
  announcementText: string;
  announcementHref: string;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  seoTitle: string;
  seoDescription: string;
  // New fields
  seoDefaultOgImage?: string | null;
  seoRobotsIndexing: boolean; // default: true
  gscVerificationTag?: string | null;
  merchantVerificationTag?: string | null;
  googleAnalyticsId?: string | null;
  merchantFeedEnabled: boolean; // default: true
  merchantBrand: string; // default: "Pandiones"
  merchantShippingFee: number; // default: 0
  merchantTransitDays: number; // default: 3
  imageQuality: number; // default: 85
}
```

### 2. Cache Purge API Contract
- `POST /api/admin/cache/purge`
- Headers: `Content-Type: application/json`
- Auth: Admin session + CSRF + 10-minute recent auth
- Body: `{ target: 'all' | 'home' | 'categories' | 'products' | 'specific', path?: string }`
- Response: `200 OK` `{ success: true, target: string, purged: string[], timestamp: string }`
- Audit Record: Action `'cache.purge'`, Entity `'cache'`, Summary string

### 3. SEO & Feed Health Diagnostics API Contract
- `GET /api/admin/health-report`
- Auth: Admin session
- Response: `200 OK`
```ts
{
  missingMeta: Array<{ type: 'product' | 'category'; id: string; name: string; slug: string; reason: string }>;
  missingAlt: Array<{ id: string; productId: string; productName: string; url: string }>;
  oversizedImages: Array<{ path: string; sizeBytes: number; format: string }>;
  ineligibleFeedProducts: Array<{ id: string; name: string; slug: string; reasons: string[] }>;
  timestamp: string;
}
```

### 4. Google Merchant XML Feed Contract
- `GET /api/feed/google-merchant`
- Output: `Content-Type: application/xml; charset=utf-8`
- Disabled state: `HTTP 404 Not Found` when `merchantFeedEnabled == false`
- Variant format: Each size variant emits an `<item>` with `<g:item_group_id>`, `<g:size>`, `<g:price>`, `<g:sale_price>` (if discounted), `<g:shipping>`, and `<g:identifier_exists>no</g:identifier_exists>` (or `<g:gtin>`/`<g:mpn>`).

---

## Code Layout
- `prisma/schema.prisma`: Authoritative database models.
- `prisma/migrations/`: Non-destructive additive SQL migrations.
- `src/lib/settings/`: Store settings reader, writer, validation, and revalidation functions.
- `src/lib/products/`: Catalog loader, collection cache, image utilities.
- `src/app/(anasayfa)/`, `src/app/[kategori]/`, `src/app/urun/[slug]/`: Storefront pages.
- `src/app/canta/`, `src/app/odeme/`: Cart and checkout client flows.
- `src/app/robots.ts`, `src/app/sitemap.ts`: Dynamic search engine index rules.
- `src/app/api/feed/google-merchant/route.ts`: Merchant XML feed route.
- `src/app/api/admin/`: Admin API endpoints (auth, settings, cache, health-report, products, categories).
- `src/app/yonetim/`: Admin interface components and tabs.
- `tests/`: Automated unit, integration, and E2E tests.

---

## Uncommitted Files Protection Rule
Under `git status --short`, 59 uncommitted files (new product editor, category tree, commerce fields migration) are actively in progress. No worker may revert, discard, or overwrite uncommitted changes without preserving their functional integrity.
