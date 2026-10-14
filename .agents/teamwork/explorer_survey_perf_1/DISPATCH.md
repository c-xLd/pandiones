## 2026-10-14T16:47:26Z
You are teamwork_preview_explorer.
Your working directory is: c:\Users\ahmet\Documents\GitHub\pandiones\.agents\teamwork\explorer_survey_perf_1\
You MUST read c:\Users\ahmet\Documents\GitHub\pandiones\.agents\teamwork\ORIGINAL_REQUEST.md first.

Also read AGENTS.md and relevant code files.
Your task:
1. Inspect existing uncommitted changes (git status --short) so the team does not overwrite or revert them.
2. Investigate Storefront Performance & Image Delivery (R1):
   - Check vitrin pages: homepage, category/subcategory, product detail, new arrivals, cart/checkout (app/(storefront)/ or equivalent).
   - Check image usage (next/image, img, formats avif/webp, widths, quality, priority on hero/LCP images, lazy on below-the-fold, CLS prevention with aspect ratio / sizes).
   - Check font loading, CSS, JS bundle sizes, unused client components ("use client"), hydration overhead.
3. Investigate Caching Architecture (R2):
   - How does Next.js App Router caching currently behave in this project?
   - What route segment configs exist (dynamic, revalidate)?
   - What fetch/DB caching exists (unstable_cache, revalidateTag, revalidatePath)?
   - What cache headers are set for static assets, images, and API responses?
   - Are private/user/admin routes properly protected with no-store/private?
   - What is the cache revalidation mechanism when products/categories/settings change in admin?
4. Write your detailed findings and handoff report to c:\Users\ahmet\Documents\GitHub\pandiones\.agents\teamwork\explorer_survey_perf_1\survey_report.md and handoff.md.
5. Send a message to parent orchestrator with your summary and file path.
