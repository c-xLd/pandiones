# BRIEFING — 2026-10-14T17:00:00Z

## Mission
Investigate SEO architecture (R3), Google Merchant Center XML feed (R4), and test suite / brand compliance against R1-R7 criteria.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, surveyor, synthesizer
- Working directory: c:\Users\ahmet\Documents\GitHub\pandiones\.agents\teamwork\explorer_survey_seo_1\
- Original parent: 11ad4927-cc30-4799-8f3d-386da9a25a72
- Milestone: survey_seo_feed_tests

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strictly adhere to AGENTS.md rules (e.g., brand word bans: atölye/atolye/atelier, maison, istanbul/İstanbul; no fake reviews/stock/trust badges)
- Files for content delivery, messages for coordination

## Current Parent
- Conversation ID: 11ad4927-cc30-4799-8f3d-386da9a25a72
- Updated: 2026-10-14T17:00:00Z

## Investigation State
- **Explored paths**:
  - `src/app/layout.tsx`, `src/app/(anasayfa)/page.tsx`, `src/app/urun/[slug]/page.tsx`, `src/app/[kategori]/page.tsx`, `src/app/[kategori]/[altKategori]/page.tsx`
  - `src/app/sitemap.ts`, `src/app/robots.ts`
  - `src/app/api/feed/google-merchant/route.ts`
  - `src/app/api/admin/settings/route.ts`, `src/app/yonetim/_components/SettingsTab.tsx`, `src/lib/settings/*`
  - `prisma/schema.prisma`
  - `tests/brand-compliance.test.ts`, `tests/admin-settings.test.ts`, test suite execution (282 tests passing, 0 TypeScript errors)
- **Key findings**:
  - Root metadata lacks `metadataBase`, canonical base, OpenGraph, Twitter cards, and Organization/WebSite JSON-LD.
  - Product page JSON-LD hardcodes `availability: 'https://schema.org/InStock'` regardless of stock (critical violation).
  - Robots.txt is static, lacks dynamic admin toggle, and omits many private routes. Sitemap includes private route `/favorilerim` and omits static guide pages.
  - Google Merchant feed outputs one item per product instead of variant-level `<item>` with `<g:item_group_id>`, lacks discount `sale_price`, lacks shipping (`<g:shipping>`), lacks GTIN/MPN/`identifier_exists`, lacks on/off 404 toggle, and has no product exclusion support.
  - Zero tests currently cover sitemap, robots, JSON-LD, feed, or cache purge.
- **Unexplored areas**: None within the assigned scope. All 3 investigation tasks thoroughly covered.

## Key Decisions Made
- Analyzed existing code against R1-R7 criteria and identified actionable implementation requirements for subsequent builder/refactoring agents.

## Artifact Index
- survey_report.md — Comprehensive findings on SEO, Google Merchant feed, and Test Suite / Brand compliance
- handoff.md — 5-component handoff report for parent orchestrator
