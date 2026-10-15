# E2E Test Infra: Pandiones

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Derived from `ORIGINAL_REQUEST.md` and user-facing specs.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | F1: Mobile image sizing fix | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | F2: Cart & checkout next/image | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | F3: Storefront alt text | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 4 | F4: Static cache headers | ORIGINAL_REQUEST §R1/R2 | 5 | 5 | ✓ |
| 5 | F5: CSS/JS bundle optimization | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 6 | F6: Private customer data isolation | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 7 | F7: Storefront data caching | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 8 | F8: Admin category revalidation | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 9 | F9: Admin product revalidation | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 10 | F10: Schema migration for SEO/feed | ORIGINAL_REQUEST §R3/R5 | 5 | 5 | ✓ |
| 11 | F11: Root layout SEO & JSON-LD | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 12 | F12: Dynamic product JSON-LD | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 13 | F13: Category BreadcrumbList JSON-LD | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 14 | F14: Dynamic robots.txt | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 15 | F15: Dynamic sitemap.xml | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 16 | F16: Private routes noindex | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 17 | F17: Google Merchant XML feed | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 18 | F18: Merchant feed toggle & 404 | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 19 | F19: Merchant product exclusions | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 20 | F20: Admin cache purge API | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |
| 21 | F21: Admin health report API | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |
| 22 | F22: Admin settings controls | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |
| 23 | F23: Product & category SEO fields | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |
| 24 | F24: GA4 integration & CSP | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: `node --test` with TypeScript loader or test scripts in `package.json`
- Test files location: `tests/e2e/`
  - `tests/e2e/tier1-features.test.ts`
  - `tests/e2e/tier2-boundaries.test.ts`
  - `tests/e2e/tier3-combinations.test.ts`
  - `tests/e2e/tier4-scenarios.test.ts`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Product Lifecycle to Feed & Sitemap | F9, F10, F12, F15, F17, F19 | High |
| 2 | Admin Toggle Robots Indexing Off and On | F11, F14, F15, F22 | High |
| 3 | Cache Invalidation on Category Reorder & Purge | F7, F8, F20, F22 | High |
| 4 | Price Change with CompareAtPrice in Merchant Feed | F9, F12, F17, F19 | High |
| 5 | Unauthorized & Cross-Site Admin Attack Simulation | F6, F20, F21, F22 | High |

## Coverage Thresholds
- Tier 1: >=5 per feature
- Tier 2: >=5 per feature (where boundaries exist)
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: >=5 realistic application scenarios
