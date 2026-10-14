## 2026-10-14T16:47:26Z
You are teamwork_preview_explorer.
Your working directory is: c:\Users\ahmet\Documents\GitHub\pandiones\.agents\teamwork\explorer_survey_seo_1\
You MUST read c:\Users\ahmet\Documents\GitHub\pandiones\.agents\teamwork\ORIGINAL_REQUEST.md first.

Also read AGENTS.md and relevant code files.
Your task:
1. Investigate SEO Architecture (R3):
   - Metadata generation across pages (generateMetadata in layout.tsx, page.tsx, product/[slug], category/[slug]).
   - Canonical URLs, title, description, Open Graph, Twitter cards.
   - Robots.txt (app/robots.ts) and Sitemap.xml (app/sitemap.ts): do they dynamically respect admin settings and draft status?
   - Structured data (JSON-LD): Product, Offer, BreadcrumbList, Organization, WebSite. Are prices and stocks dynamic and matching DB?
2. Investigate Google Merchant Center XML Feed (R4):
   - Check /api/feed/google-merchant (or current feed route).
   - Validate Google Merchant specifications: XML structure, required fields (id, title, description, link, image_link, availability, price, brand, etc.), item_group_id for variants, shipping/tax, draft filtering, exclusion logic.
3. Investigate Existing Test Suite & Brand Compliance:
   - Run tests analysis (check tests/, npm test, tests/brand-compliance.test.ts, what is currently tested, total test count).
   - Identify gaps against R1-R7 acceptance criteria.
4. Write your detailed findings and handoff report to c:\Users\ahmet\Documents\GitHub\pandiones\.agents\teamwork\explorer_survey_seo_1\survey_report.md and handoff.md.
5. Send a message to parent orchestrator with your summary and file path.
