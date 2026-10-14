# Pandiones R5 Admin Panel Controls & Operations Specification Report

**Generated Date**: 2026-10-14  
**Author**: teamwork_preview_spec_miner  
**Working Directory**: `c:\Users\ahmet\Documents\GitHub\pandiones\.agents\teamwork\spec_miner_survey_1\`  
**Target Scope**: R5 Admin Panel Controls, Merchant Feed, Site Settings, SEO Engine, Performance/Health Diagnostics, Cache Purge, Verification Tags (GSC, GA4, Merchant), Audit Logs, and Database Models.

---

## 1. Executive Summary & Objective Mapping

Pandiones is a Next.js 15 (App Router), React 19, Prisma ORM, and PostgreSQL e-commerce platform. Under milestone R5 and the project requirements outlined in `ORIGINAL_REQUEST.md`, `AGENTS.md`, `docs/pages/ADMIN.md`, `docs/CONTENT-SEO.md`, `docs/SECURITY.md`, and `docs/DATA.md`, all administration controls must be persistent in PostgreSQL, authoritative, protected by 2FA and CSRF guards, logged to `AuditLog`, and strictly zero-mock.

This specification survey maps:
1. All current database models and identifies missing schema fields/tables for site-wide settings, per-product/category/page SEO, merchant feed controls, verification tags, and diagnostics.
2. Current admin panel routes (`/yonetim`, `/api/admin/*`) and security contracts (`requireAdmin`, `requireRecentAuth`, `isCrossSiteMutation`).
3. Google Merchant Center XML feed specifications (`/api/feed/google-merchant`) vs. current behavior.
4. Cache invalidation mechanics (`revalidatePath`, `revalidateTag`) and purge API endpoints.
5. Verification tags (Google Search Console, Google Merchant) and Google Analytics 4 (GA4) integration, including Content Security Policy (CSP) adjustments.
6. Diagnostic health reporting for missing meta, missing alt text, oversized images, and ineligible feed products.
7. Architectural and brand constraints (zero mock data, forbidden words, zero fake marketing badges, additive non-destructive migrations).

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Site Settings | Global Store & Branding Settings | Manages store name, contact email/phone, WhatsApp, social URLs, free shipping threshold, and low-stock threshold. | `StoreSettingsValues` (JSON body) | Updated `StoreSettings` object | 422 for invalid format, 409 for stale `updatedAt` conflict, 401 for reauth | `src/app/api/admin/settings/route.ts`, `src/lib/settings/shared.ts` |
| 2 | Site Settings | Announcement & Maintenance Control | Controls top announcement bar text/link and site-wide maintenance mode (503 for visitors, bypass for admins). | `announcementEnabled`, `announcementText`, `announcementHref`, `maintenanceEnabled`, `maintenanceMessage` | Status 200, revalidates `store-settings` | 422 if announcement enabled without text or invalid URL | `src/middleware.ts`, `src/lib/settings/maintenance.ts` |
| 3 | Site Settings (Missing) | Site-wide SEO & Robots Indexing Control | Controls default meta title, description, fallback OG image URL, and robots indexing toggle (`robots.txt` disallow all / meta `noindex`). | `seoTitle`, `seoDescription`, `seoDefaultOgImage`, `seoRobotsIndexing` (boolean) | Stored in `StoreSettings`, reflects on `robots.txt`, `layout.tsx` metadata | 422 if title > 70 chars or description > 170 chars | R5 in `ORIGINAL_REQUEST.md`, missing in `schema.prisma` |
| 4 | Site Settings (Missing) | Verification Tags & GA4 Configuration | Stores Google Search Console verification meta tag, Google Merchant verification meta tag, and GA4 measurement ID. | `gscVerificationTag`, `merchantVerificationTag`, `googleAnalyticsId` | Injected into `<head>` / metadata, loads GA4 dynamically without blocking LCP | 422 on invalid GA4 format (`G-[A-Z0-9]+`), CSP blocks if not whitelisted | R5 in `ORIGINAL_REQUEST.md`, missing in `StoreSettings` |
| 5 | Site Settings (Missing) | Image Quality & Format Controls | Configures default image rendering quality (e.g. 60–90) and format preferences in `next/image`. | `imageQuality` (number, 60–90), `imageFormat` | Stored in settings, used in dynamic image loader/resizer | 422 if outside allowed quality boundaries | R5 in `ORIGINAL_REQUEST.md`, hardcoded in `src/lib/images.ts` |
| 6 | Merchant Feed | Google Merchant Center XML Feed | Generates XML feed at `/api/feed/google-merchant` for Google Shopping. | HTTP GET request | XML RSS 2.0 with `<g:...>` tags | Returns 500 on internal failure (currently lacks 404 when disabled) | `src/app/api/feed/google-merchant/route.ts` |
| 7 | Merchant Feed (Missing) | Merchant Feed Management & Toggle | Configures merchant feed on/off, brand name, shipping price/transit, product exclusion, and feed status endpoint. | `merchantFeedEnabled`, `merchantBrand`, `merchantShippingFee`, `merchantTransitDays` | Returns 404 when disabled; returns feed metadata and statistics in admin | 404 on GET when `merchantFeedEnabled = false` | R5 & R4 in `ORIGINAL_REQUEST.md`, `docs/QA.md` |
| 8 | Merchant Feed (Missing) | Variant & Product Item Group Feed | Feeds variants with `g:item_group_id`, `g:size`, `g:color`, `g:price`, `g:sale_price`, `g:gtin`, `g:mpn`. | Product & Variant database records | Compliant Google XML output | Skips products with missing required fields and logs reasons | Google Merchant Specification, R4 in `ORIGINAL_REQUEST.md` |
| 9 | Catalog SEO (Missing) | Product-Level SEO Overrides | Overrides title, description, canonical URL, noindex flag, and merchant feed exclusion per product. | `seoTitle`, `seoDescription`, `canonicalUrl`, `noindex`, `excludeFromFeed` | Overrides default metadata in `/urun/[slug]`, excludes from sitemap/feed | 400/422 on invalid URL or exceeding char limits | R5 in `ORIGINAL_REQUEST.md`, missing in `Product` model |
| 10 | Catalog SEO (Missing) | Category-Level SEO Overrides | Overrides title, description, canonical URL, and noindex flag per category/subcategory. | `seoTitle`, `seoDescription`, `canonicalUrl`, `noindex` | Overrides default metadata in `/[kategori]` and `/[kategori]/[altKategori]` | 400/422 on validation failure | R5 in `ORIGINAL_REQUEST.md`, missing in `Category` model |
| 11 | Custom Page SEO (Missing) | Standalone Page SEO Management | Manages SEO title, description, canonical, and noindex for non-catalog pages (`/`, `/yeni-gelenler`, `/hediye-karti`, etc.). | `PageSeoOverride` model or settings map (`path`, `title`, `description`, `canonicalUrl`, `noindex`, `ogImage`) | Injected in page `generateMetadata()` | 400 if path invalid or duplicate | R5 in `ORIGINAL_REQUEST.md`, currently hardcoded |
| 12 | Cache Controls (Missing) | On-Demand Cache Purge & Revalidation | Allows admin to purge/revalidate cache for home page, all categories, specific product, or entire storefront. | `POST /api/admin/cache/purge` with `{ target: 'all' | 'home' | 'categories' | 'products' | 'specific', path?: string }` | JSON `{ success: true, purged: string[], timestamp: string }` | 400 for unknown target, 403 for unauthorized, 401 for step-up auth | R5 in `ORIGINAL_REQUEST.md`, Acceptance Criteria 57 |
| 13 | Diagnostics (Missing) | Performance & SEO Health Report | Audits database and assets for missing meta descriptions, missing alt texts, oversized images, and merchant feed disqualifications. | `GET /api/admin/health-report` | JSON `{ missingMeta: [...], missingAlt: [...], oversizedImages: [...], ineligibleFeedProducts: [...] }` | 403 if not admin, honest empty state when 0 issues | R5 in `ORIGINAL_REQUEST.md`, Acceptance Criteria 33 |
| 14 | Security & Auth | Admin Session & Role Enforcement | Ensures only authenticated `ADMIN` users with completed TOTP 2FA can access `/yonetim` and `/api/admin/*`. | Session cookie (`__Host-pandiones_auth`) or Bearer token | Allowed or 403/404 | 403 on API, 404 on page for non-admin/unauthenticated | `src/middleware.ts`, `src/lib/security/admin-guard.ts` |
| 15 | Security & Auth | Step-Up Reauthentication | Requires re-confirming 2FA within 10 minutes (`REAUTH_WINDOW_MS`) before mutating settings, refunds, or deleting products. | `session.reauthAt` | Allowed or 401 `{ code: 'REAUTH_REQUIRED' }` | 401 forces prompt dialog in admin client | `src/lib/security/admin-guard.ts`, `src/app/api/admin/settings/route.ts` |
| 16 | Security & Auth | Cross-Site Mutation (CSRF) Guard | Verifies `Origin` or `Sec-Fetch-Site` on mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`). | Request origin headers | Continues or rejects with 403 | 403 on cross-origin mutation | `src/lib/security/edge-rules.ts` |
| 17 | Audit Logging | Transactional & Post-Commit Activity Logs | Records user ID, email, action, entity, entityId, summary, and JSON diff for all administrative operations. | `actorId`, `actorEmail`, `action`, `entity`, `entityId`, `summary`, `diff` | Stored in `AuditLog` table | Non-blocking via `recordAuditAfter` or atomic via transaction `recordAudit` | `src/lib/audit.ts`, `src/app/api/admin/audit/route.ts` |
| 18 | Structured Data | Product & Offer JSON-LD | Emits schema.org `Product` and `Offer` structured data on product detail pages. | Live product data | `<script type="application/ld+json">` | Missing dynamic `availability` (currently hardcoded to InStock) | `src/app/urun/[slug]/page.tsx`, R3 |
| 19 | Structured Data (Missing) | Category BreadcrumbList & Site Organization/WebSite JSON-LD | Emits `BreadcrumbList` on category pages and `Organization` / `WebSite` structured data on storefront. | Store settings & category placement | Schema.org JSON-LD scripts | Currently absent in `[kategori]` and root `layout.tsx` | R3 in `ORIGINAL_REQUEST.md` |
| 20 | Robots & Sitemap | Dynamic `robots.txt` & `sitemap.xml` | Exposes crawl rules and published URL index. | Live DB query of published products and categories | Robots text and Sitemap XML | Robots ignores admin settings toggle; sitemap currently includes `/favorilerim` | `src/app/robots.ts`, `src/app/sitemap.ts` |

---

## 3. Edge Cases & Observed Behavior

| # | Feature | Input / Condition | Observed Behavior & Specification Requirement |
|---|---------|-------------------|------------------------------------------------|
| 1 | Site Settings | Stale Form Submission (Concurrent Admin Edit) | Client sends `updatedAt` older than DB record. API returns `409 Conflict` with latest DB settings; client displays warning without overwriting. |
| 2 | Site Settings | Malformed URLs or Script Injection | `announcementHref: "javascript:alert(1)"` or `instagramUrl: "http://attacker.com"`. Validated and rejected with 422 field error; only `https://` on approved hosts or internal site paths (`/path`) allowed. |
| 3 | Robots Indexing | Site Indexing Disabled in Admin Panel (`seoRobotsIndexing = false`) | `robots.txt` must output `User-agent: *\nDisallow: /`. All indexable storefront pages must emit `<meta name="robots" content="noindex, nofollow" />`. |
| 4 | Merchant Feed | Feed Disabled in Admin Panel (`merchantFeedEnabled = false`) | `GET /api/feed/google-merchant` must return `HTTP 404 Not Found` (Acceptance Criteria 52). |
| 5 | Merchant Feed | Product with Zero Total Variant Stock | `<g:availability>` outputs `out_of_stock`. Must NOT output hardcoded `in_stock`. |
| 6 | Merchant Feed | Product with `compareAtPrice` Higher Than `price` | Google Merchant specification requires `<g:price>` = regular list price (`compareAtPrice`), and `<g:sale_price>` = discounted active price (`price`). |
| 7 | Merchant Feed | Ineligible Product (Missing image, missing price, draft status, or `excludeFromFeed = true`) | Product must be excluded from XML feed entirely and reported in `GET /api/admin/health-report` with specific error reasons. |
| 8 | Product JSON-LD | Product with All Variants Out of Stock | Schema.org `offers.availability` must evaluate to `'https://schema.org/OutOfStock'`. Currently hardcoded to `'https://schema.org/InStock'` in `urun/[slug]/page.tsx`. |
| 9 | Cache Purge | Target `'specific'` with Unmatched or Malformed Path | Must validate path format (must start with `/`), sanitize input, and return accurate list of purged paths without crashing. |
| 10 | GA4 Script | Invalid Measurement ID or ID Unset | If `googleAnalyticsId` is null/empty or does not match `/^G-[A-Z0-9]+$/`, zero script tags are injected into HTML, avoiding blank network calls and CSP violations. |
| 11 | CSP Headers | GA4 Measurement Enabled | If GA4 is configured, Next.js Content Security Policy (`headers.mjs`) must permit `https://www.googletagmanager.com` in `script-src`, and `https://*.google-analytics.com` in `connect-src` and `img-src`. |
| 12 | Health Report | Zero Issues in Database | Must return clean empty arrays `{ missingMeta: [], missingAlt: [], oversizedImages: [], ineligibleFeedProducts: [] }`. Admin UI displays clean checkmark status ("Sorun tespit edilmedi"). Never show fake mock diagnostics. |
| 13 | Category Deletion | Deleting Category with Associated Products | Category delete API rejects or cascades safely per schema constraints. Must log to `AuditLog`. |
| 14 | Brand Compliance | Any Admin Input or Report Containing Prohibited Words | Prohibited words ("atölye", "atolye", "atelier", "maison", "istanbul") and fake marketing badges are rejected by CI tests and must never appear in default values, descriptions, or report summaries. |

---

## 4. Database Schema Analysis & Required Non-Destructive Migrations

### 4.1 Existing Tables in `prisma/schema.prisma`
- `User`: Accounts and roles (`CUSTOMER` | `ADMIN`), TOTP 2FA fields, lockout counters.
- `Session`: Server-side sessions, `idleExpiresAt` (30m inactivity window), `reauthAt` (10m step-up window), `mfa` flag.
- `StoreSettings`: Single-row (`id = "store"`) store-wide configuration.
- `AuditLog`: Admin audit history (`actorId`, `actorEmail`, `action`, `entity`, `entityId`, `summary`, `diff`, `createdAt`).
- `Product`: Catalog products (`slug`, `name`, `price`, `compareAtPrice`, `vatRate`, `color`, `category`, `subcategory`, `status`, `featured`, `description`, `details`, `material`, `care`).
- `Category`: Hierarchy tree (`slug`, `name`, `description`, `parentId`, `displayOrder`, `image`, `isActive`).
- `ProductMedia`: Images/videos (`productId`, `kind`, `role`, `storageKey`, `url`, `posterUrl`, `alt`, `position`, `isCover`).
- `Variant`: Stock items (`productId`, `size`, `stock`, `sku`, `barcode`).
- `Order`, `OrderItem`, `PaymentTransaction`, `Shipment`, `ShipmentEvent`, `Coupon`, `GiftCard`, `ContactMessage`, `Newsletter`, `StockAlert`.

### 4.2 Migration History in `prisma/migrations`
1. `20261003000000_init`: Initial baseline PostgreSQL schema.
2. `20261004000000_shipping`: PTT shipping and shipment tracking models.
3. `20261014000000_product_commerce_fields`: Added `compareAtPrice`, `vatRate` to `Product`, `sku` and `barcode` to `Variant`, and `vatRate` to `OrderItem`.

### 4.3 Missing Fields & New Models Required for R5
To fulfill all R5 requirements without breaking any existing data, the following additive changes must be introduced in a new migration:

#### A. Additions to `StoreSettings` Model
```prisma
// SEO & Verification
seoDefaultOgImage      String?
seoRobotsIndexing      Boolean  @default(true)
gscVerificationTag     String?
merchantVerificationTag String?
googleAnalyticsId      String?

// Google Merchant Feed
merchantFeedEnabled    Boolean  @default(true)
merchantBrand          String   @default("Pandiones")
merchantShippingFee    Float    @default(0)
merchantTransitDays    Int      @default(3)

// Image Delivery
imageQuality           Int      @default(85)
```

#### B. Additions to `Product` Model
```prisma
seoTitle         String?
seoDescription   String?
canonicalUrl     String?
noindex          Boolean  @default(false)
excludeFromFeed  Boolean  @default(false)
```

#### C. Additions to `Category` Model
```prisma
seoTitle         String?
seoDescription   String?
canonicalUrl     String?
noindex          Boolean  @default(false)
```

#### D. New Model: `PageSeoOverride` (for Standalone Route SEO)
```prisma
model PageSeoOverride {
  id           String   @id @default(cuid())
  path         String   @unique // e.g. "/", "/yeni-gelenler", "/hediye-karti", "/iletisim"
  title        String?
  description  String?
  canonicalUrl String?
  noindex      Boolean  @default(false)
  ogImage      String?
  updatedAt    DateTime @updatedAt
  updatedById  String?

  @@index([path])
}
```

*Migration Safety Verification*: All additions are either nullable (`String?`, `Float?`) or have `@default(...)` values. No tables or columns are dropped. Existing rows are 100% preserved.

---

## 5. Admin Panel Interface & API Architecture

### 5.1 Route Inventory & Status Comparison

| Route Path | Method | Current Status | Required R5 Functionality | Missing Compared to R5 |
|---|---|---|---|---|
| `/yonetim` | GET | Active shell | Dashboard, orders, catalog, store settings tabs | Health Diagnostics tab/view, Cache purge UI, Feed management view |
| `/api/admin/settings` | GET, PUT | Implemented | Reads/writes store settings | Missing validation & storage for new SEO, Verification, Merchant, and Image quality fields |
| `/api/admin/cache/purge` | POST | **Missing (404)** | Purges Next.js tag/path caches | Entire route handler and helper functions need creation |
| `/api/admin/health-report` | GET | **Missing (404)** | Runs live diagnostics on meta, alts, images, and feed eligibility | Entire diagnostic engine and route handler need creation |
| `/api/admin/feed/google-merchant` (or `/api/feed/google-merchant`) | GET | Partially implemented | Serves XML feed; respects toggle; includes variants & item_group_id | Toggle check (404), variant decomposition, `g:item_group_id`, sale_price, shipping node |
| `/api/admin/seo/pages` | GET, PUT | **Missing (404)** | Lists and updates standalone page SEO overrides | Needs Route Handler for `PageSeoOverride` |
| `/api/admin/categories` | GET, POST, PATCH, DELETE | Implemented | Manages category CRUD | Missing `seoTitle`, `seoDescription`, `canonicalUrl`, `noindex` fields in input & DB |
| `/api/admin/products/[id]` | GET, PATCH, DELETE | Implemented | Manages product details | Missing `seoTitle`, `seoDescription`, `canonicalUrl`, `noindex`, `excludeFromFeed` in `saveProduct` |
| `/api/admin/audit` | GET | Implemented | Lists audit events | Needs to support filtering by new entities: `'seo'`, `'cache'`, `'feed'` |

### 5.2 Security & Authorization Guard Contract
All newly introduced routes MUST implement the multi-tier defense established in `docs/SECURITY.md`:
1. **Middleware Layer** (`src/middleware.ts`):
   - Path under `/api/admin/` enforces active session row lookup.
   - Requires `session.role === 'ADMIN'` and `session.mfa === true`.
   - Rejects cross-origin state mutations (`isCrossSiteMutation` → 403).
   - Sets headers: `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`.
2. **Route Handler Layer**:
   - `const { session, response } = await requireAdmin(request);`
   - For sensitive operations (`/api/admin/cache/purge`, `/api/admin/settings`):
     `const stepUp = requireRecentAuth(session); if (stepUp) return stepUp;` (prompts for 2FA confirmation if older than 10 minutes).
3. **Audit Trail**:
   - Every mutation records a row in `AuditLog` using `recordAudit` (in-transaction) or `recordAuditAfter` (post-commit).

---

## 6. Google Merchant Center Feed Technical Specification

### 6.1 Feed Standards (`/api/feed/google-merchant`)
- **Protocol**: RSS 2.0 with XML namespace `xmlns:g="http://base.google.com/ns/1.0"`.
- **Toggle Contract**: When `StoreSettings.merchantFeedEnabled == false`, the route returns `HTTP 404 Not Found`.
- **Eligibility Filter**:
  - `status == "PUBLISHED"`
  - `excludeFromFeed == false`
  - `price > 0`
  - Has valid primary `image`
  - Has at least one variant with valid size
- **Variant Grouping**:
  - Base product with variants emits one `<item>` per variant.
  - `<g:id>` = `${product.id}_${variant.size}` (or variant SKU/ID).
  - `<g:item_group_id>` = `product.familyId || product.id`.
  - `<g:size>` = variant size (e.g. "S", "M", "75B").
  - `<g:color>` = product color name.
- **Price & Sale Price**:
  - If `compareAtPrice` exists and is greater than `price`:
    - `<g:price>` = `${compareAtPrice.toFixed(2)} TRY`
    - `<g:sale_price>` = `${price.toFixed(2)} TRY`
  - If no `compareAtPrice`:
    - `<g:price>` = `${price.toFixed(2)} TRY`
- **Shipping Node**:
  ```xml
  <g:shipping>
    <g:country>TR</g:country>
    <g:service>Standart Kargo</g:service>
    <g:price>${shippingFee.toFixed(2)} TRY</g:price>
  </g:shipping>
  ```
- **Identifiers**:
  - If variant has `barcode` (EAN-13): `<g:gtin>${variant.barcode}</g:gtin>`.
  - If variant has `sku`: `<g:mpn>${variant.sku}</g:mpn>`.
  - If neither: `<g:identifier_exists>no</g:identifier_exists>`.
- **Brand**: Dynamically populated from `StoreSettings.merchantBrand` (default "Pandiones").

---

## 7. Performance & SEO Health Diagnostic Specification

### 7.1 Diagnostic Audit Scope (`/api/admin/health-report`)
The health report runs live queries against the PostgreSQL database and public asset references:
1. **Missing Meta Descriptions**:
   - Products where `description` is empty or `< 20` characters.
   - Categories where `description` is null or empty.
2. **Missing Alt Texts**:
   - `ProductMedia` records where `alt` is empty string or only whitespace.
3. **Oversized Images**:
   - Inspects `public/assets` and referenced images. Any asset file exceeding `1 MB` (1,048,576 bytes) or raw PNG in place of WebP/AVIF is flagged.
4. **Feed Ineligible Products**:
   - Identifies any published product that fails Google Merchant Center requirements (missing image, price <= 0, missing category, empty stock, or invalid barcode).
   - Returns array: `[ { id, name, slug, reasons: string[] } ]`.

### 7.2 Admin UI Presentation
- Displays in `/yonetim` with instant summary tiles (e.g., "0 Eksik Meta", "0 Eksik Alt Metin", "X Büyük Görsel").
- Expandable cards detailing specific items with direct navigation to fix them.
- Dürüst boş durum (honest empty state): "Tüm ürünler ve medya dosyaları sağlık kriterlerini karşılıyor."

---

## 8. Cache Purge & Invalidation Specification

### 8.1 Invalidation Map

| Purge Target | Actions Executed | Impact on Storefront |
|---|---|---|
| `home` | `revalidatePath('/', 'page')`<br>`revalidateTag('catalog')` | Refreshes home product grid, featured stories, announcement. |
| `categories` | `revalidatePath('/[kategori]', 'page')`<br>`revalidatePath('/[kategori]/[altKategori]', 'page')` | Refreshes all collection views and category descriptions. |
| `products` | `revalidatePath('/urun/[slug]', 'page')`<br>`revalidateTag('catalog')` | Clears cached product details, stock availability, and JSON-LD. |
| `all` | `revalidatePath('/', 'layout')`<br>`revalidateTag('catalog')`<br>`revalidateTag('store-settings')` | Full application tree cache flush. |
| `specific` | `revalidatePath(path)` | Flushes exact specified route path (e.g. `/urun/pembe-balen`). |

### 8.2 Purge API Contract
- `POST /api/admin/cache/purge`
- Body: `{ target: 'home' | 'categories' | 'products' | 'all' | 'specific', path?: string }`
- Response: `200 OK` `{ success: true, target: string, purged: string[], timestamp: string }`
- Audit Record: Action `'cache.purge'`, Entity `'cache'`, Summary `'Önbellek temizlendi: [target]'`.

---

## 9. Verification Tags & Analytics (GSC, GA4, Merchant)

### 9.1 Metadata Integration in `src/app/layout.tsx`
`generateMetadata` reads `getStoreSettings()`:
```ts
verification: {
  google: settings.gscVerificationTag || undefined,
  other: {
    ...(settings.merchantVerificationTag ? { 'google-site-verification': settings.merchantVerificationTag } : {}),
  },
}
```

### 9.2 GA4 Dynamic Loading & Performance Budget
- If `settings.googleAnalyticsId` is configured:
  Injects `<Script src="https://www.googletagmanager.com/gtag/js?id=..." strategy="afterInteractive" />`.
- Configures `anonymize_ip: true` to adhere to `docs/SECURITY.md` privacy guidelines.
- Does NOT block First Contentful Paint (FCP) or Largest Contentful Paint (LCP).

### 9.3 Content Security Policy (CSP) Updates in `src/lib/security/headers.mjs`
To allow GA4 when enabled:
- `script-src`: add `https://www.googletagmanager.com`
- `connect-src`: add `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`
- `img-src`: add `https://*.google-analytics.com https://*.googletagmanager.com`

---

## 10. Constraints & Compliance Checklist

1. **Zero Mock Data Principle**:
   - Zero hardcoded diagnostics, zero simulated success responses, zero fake test metrics.
   - All report lists and feed entries come directly from the PostgreSQL database or filesystem.
2. **Brand Compliance (`tests/brand-compliance.test.ts`)**:
   - Forbidden words strictly banned: `atölye`, `atolye`, `atelier`, `maison`, `istanbul` (in all cases).
   - Artificial marketing badges strictly banned: `Özel Pandiones Kutusu`, `Sigortalı Gönderim`, `30 Gün Değişim`, `BDDK güvencesi`, `uçtan uca şifreleme`.
   - Zero dead anchor links: `href="#"` is strictly prohibited.
3. **Audit Log Coverage**:
   - All mutations through admin controls (`settings.update`, `cache.purge`, `category.update`, `product.update`, `page_seo.update`) must generate structured `AuditLog` rows.
4. **Non-Destructive Database Migrations**:
   - All new columns are nullable or have default values.
   - Migrations are deployable with `prisma migrate deploy` without disrupting live tables.
