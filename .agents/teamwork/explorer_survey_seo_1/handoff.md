# Handoff Report — SEO Architecture, Google Merchant Feed & Test Suite Audit

**Agent:** `explorer_survey_seo_1`  
**Working Directory:** `c:\Users\ahmet\Documents\GitHub\pandiones\.agents\teamwork\explorer_survey_seo_1\`  
**Date:** 2026-10-14  
**Handoff Type:** Hard (Survey Task Complete)

---

## 1. Observation

Direct observations with exact file paths, line numbers, and tool execution outputs:

1. **Product JSON-LD Fixed Availability (Mock Violation):**
   - File: `src/app/urun/[slug]/page.tsx`, lines 91–97:
     ```ts
     offers: {
       '@type': 'Offer',
       url: `${siteUrl}${productHref(product.slug)}`,
       price: product.price,
       priceCurrency: 'TRY',
       availability: 'https://schema.org/InStock',
     },
     ```
     The availability is unconditionally `'https://schema.org/InStock'` regardless of whether `product.variants` have total stock > 0 or 0.

2. **Root Layout Metadata & Base URL:**
   - File: `src/app/layout.tsx`, lines 37–40:
     ```ts
     export async function generateMetadata(): Promise<Metadata> {
       const settings = await getStoreSettings();
       return { title: settings.seoTitle, description: settings.seoDescription, ...FAVICON };
     }
     ```
     `metadataBase` is not defined in `src/app/layout.tsx`. Open Graph, Twitter cards, and default canonical URLs are absent.

3. **Hardcoded Canonical URLs & Category Metadata:**
   - File: `src/app/urun/[slug]/page.tsx`, line 33:
     `const canonicalUrl = \`https://pandiones.com\${productHref(product.slug)}\`;`
   - File: `src/app/[kategori]/page.tsx`, line 8:
     `const SITE = 'https://pandiones.com';`
   - File: `src/app/[kategori]/[altKategori]/page.tsx`, line 8:
     `const SITE = 'https://pandiones.com';`
   - Neither category page defines `openGraph`, `twitter`, or `BreadcrumbList` JSON-LD.

4. **Robots.txt Implementation:**
   - File: `src/app/robots.ts`, lines 3–14:
     ```ts
     export default function robots(): MetadataRoute.Robots {
       const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pandiones.com';

       return {
         rules: {
           userAgent: '*',
           allow: '/',
           disallow: ['/yonetim/', '/api/', '/odeme/', '/siparis-onay/'],
         },
         sitemap: `${baseUrl}/sitemap.xml`,
       };
     }
     ```
     Does not query database/settings (`getStoreSettings()`). Does not support admin site indexing toggle (`disallow: '/'`). Missing disallow paths for `/sepet/`, `/canta/`, `/hesabim/`, `/favorilerim/`, `/siparislerim/`, `/siparis-takip/`, `/giris-yap/`, `/sifremi-unuttum/`, `/sifre-sifirla/`.

5. **Sitemap Implementation:**
   - File: `src/app/sitemap.ts`, lines 52–56:
     ```ts
     {
       url: `${baseUrl}/favorilerim`,
       lastModified: new Date(),
       changeFrequency: 'weekly' as const,
       priority: 0.7,
     },
     ```
     `/favorilerim` is a user private wishlist page included in the public sitemap. Public informational pages (`/yardim`, `/iletisim`, `/beden-rehberi`, `/bakim-rehberi`, `/stil-rehberi`, `/hediye-karti`) are absent.

6. **Private Route Indexing Protection:**
   - `src/app/yonetim/page.tsx`, `src/app/sepet/page.tsx`, `src/app/canta/page.tsx`, `src/app/odeme/page.tsx`, `src/app/hesabim/page.tsx`, `src/app/siparislerim/page.tsx`, `src/app/siparis-takip/page.tsx`, `src/app/favorilerim/page.tsx`, and `src/app/giris-yap/page.tsx` have no `robots: { index: false }` metadata. Only `yonetim/giris/layout.tsx`, `e-posta-dogrula/layout.tsx`, `bakim/page.tsx`, `sifre-sifirla/layout.tsx`, and `sifremi-unuttum/layout.tsx` have it.

7. **Google Merchant Center Feed:**
   - File: `src/app/api/feed/google-merchant/route.ts`:
     - Outputs single `<item>` per `product` (lines 22–58), missing variant-level `<item>` and `<g:item_group_id>`.
     - Lines 41, 54: outputs `<g:price>${product.price.toFixed(2)} TRY</g:price>`. Completely ignores `compareAtPrice` and emits no `<g:sale_price>`.
     - Missing `<g:shipping>` blocks.
     - Missing `<g:gtin>`, `<g:mpn>`, and `<g:identifier_exists>no</g:identifier_exists>`.
     - No on/off switch checking admin settings; never returns 404.
     - No product exclusion logic (`excludeFromMerchantFeed`).

8. **Test Suite & Type Check Status:**
   - Command: `npm test`
     - Result: `tests 282, pass 282, fail 0, skipped 0, duration: ~160s`.
   - Command: `npx tsc --noEmit`
     - Result: Exit code 0, 0 errors.
   - Command: `npx tsx --test tests/brand-compliance.test.ts`
     - Result: 3/3 tests passed (no forbidden words in `src/`, no artificial badges, no dead `href="#"`).
   - Grep in `tests/`: 0 tests exist for `sitemap`, 0 for `robots`, 0 for `feed`, 0 for JSON-LD.

---

## 2. Logic Chain

1. **From Observation 1 to Mock Defect:**
   - AGENTS.md states: "Örnek veri, sahte ödeme, uydurma yorum/stok/sipariş ve sessiz başarısızlık canlı davranış olarak sunulamaz."
   - R3 requires: "fiyat ve stok veritabanıyla birebir eşleşir (otomatik test)".
   - Because `src/app/urun/[slug]/page.tsx:96` hardcodes `'https://schema.org/InStock'`, an out-of-stock product will still publish structured data asserting it is in stock. This directly violates the zero-mock requirement.

2. **From Observations 2, 3, 4, 5, 6 to SEO Deficiencies (R3):**
   - Without `metadataBase` in root layout, canonical and social sharing image resolution is fragile across different domains.
   - Hardcoding `https://pandiones.com` breaks preview deployments on Vercel (`https://pandiones.vercel.app`).
   - Exposing `/favorilerim` in sitemap while failing to `noindex` private pages (`/sepet`, `/hesabim`, `/yonetim`) leaks user/admin paths to search engine crawlers, violating R3 ("Yönetim, hesap, sepet, ödeme ve benzeri özel sayfalar indekslenmemeli").
   - Static `robots.ts` fails acceptance criterion R5 ("sitenin indekslenmesini aç/kapat (robots)").

3. **From Observation 7 to Google Merchant Center Feed Deficiencies (R4):**
   - Google Shopping specifications for apparel require variant-level entries or `item_group_id` for sizing and color options.
   - Missing `<g:sale_price>` when `compareAtPrice` exists prevents Google from recognizing discounts.
   - Missing `<g:shipping>` violates Google Merchant feed requirements for Turkey target delivery.
   - Missing `<g:identifier_exists>no</g:identifier_exists>` causes feed rejection when products lack GTIN/MPN.
   - Lack of an enable/disable switch directly fails acceptance criterion R4 ("akış kapatıldığında 404 döner").

4. **From Observation 8 to Testing Gap:**
   - Despite 282 unit/integration tests passing in the repo, the SEO, Feed, and Cache Invalidation functionalities have 0 test coverage. Acceptance criteria for R3, R4, and R5 specifically mandate automated tests for these capabilities.

---

## 3. Caveats

- **Prisma Schema Migrations:** Adding new fields to `StoreSettings`, `Product`, and `Category` requires creating a migration (`prisma/migrations/...`). Per AGENTS.md, migrations must be non-destructive, preserve existing data, and never run seed scripts in production.
- **External Network Access:** Live Google Merchant feed submission and Google Search Console verification cannot be tested against Google servers in a local environment; verification must rely on schema validation and HTTP tests locally.
- **No other caveats.**

---

## 4. Conclusion

The existing codebase is structurally solid with 282 passing tests and strict brand compliance, but **has clear architectural gaps in SEO (R3), Google Merchant feed (R4), and Admin controls (R5)**:
1. JSON-LD availability is hardcoded to "InStock" (must be made dynamic).
2. Root metadata lacks `metadataBase`, canonical base, OpenGraph, and Twitter tags.
3. Sitemap leaks `/favorilerim` and omits public guide pages; Robots.txt lacks dynamic toggle and full private route blocking.
4. Google Merchant feed lacks variant items with `item_group_id`, `sale_price`, `shipping`, GTIN/MPN/`identifier_exists`, and the 404 toggle.
5. All of the above lack automated tests.

A detailed implementation report has been saved to:
`c:\Users\ahmet\Documents\GitHub\pandiones\.agents\teamwork\explorer_survey_seo_1\survey_report.md`

---

## 5. Verification Method

To independently reproduce and verify every finding in this report:

1. **Verify Test Suite & TypeScript Status:**
   ```powershell
   npx tsc --noEmit
   npm test
   npx tsx --test tests/brand-compliance.test.ts
   ```
2. **Verify JSON-LD Hardcoded "InStock":**
   Inspect `src/app/urun/[slug]/page.tsx` at line 96: check that `availability: 'https://schema.org/InStock'` is hardcoded.
3. **Verify Robots.txt & Sitemap.xml:**
   Inspect `src/app/robots.ts` and `src/app/sitemap.ts` (line 52 `/favorilerim`).
4. **Verify Google Merchant Feed:**
   Inspect `src/app/api/feed/google-merchant/route.ts`: observe missing `item_group_id`, `sale_price`, `shipping`, and absence of 404 check.
5. **Verify Zero SEO/Feed Tests:**
   Search pattern in `tests/`:
   ```powershell
   git grep -i "google-merchant" tests/
   git grep -i "sitemap" tests/
   ```
   Both return 0 matches.
