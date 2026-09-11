# Pandiones — Campaign commerce
User-approved September 9 direction: adapt Lefties Turkey visual navigation to Pandiones luxury lingerie. Reference observed in browser: full-bleed paired fashion images, compact overlaid header, centered short campaign title, category-photo links, another full-width campaign. Do not copy Lefties brand, photography or irrelevant apparel categories.
Implementation: paired new adult sleepwear campaign and existing ivory lingerie still-life, horizontal category navigation, three image-led category links, chocolate sleepwear campaign, concise product selection, brand closing. On mobile campaigns use a single portrait, categories scroll with native snap. No autoplay, hijacked scrolling or sidebar filters.
Runtime token owner: dist/style.css :root. paper #f8f8f6; ink/dark #202120; muted #626560; line #dedfda; surface #eeefeb. Logo and controls Arial; restrained campaign headings Bodoni/Didot/Times fallback. Header is transparent at the top with dark controls suited to the light campaign imagery; after 40px scroll it gains a blurred neutral off-white surface.
Preserve existing three concept products, live search/filter/detail/required size selection/cart quantity and removal. Native modal menu, dialog focus management, Escape, focus rings, reduced-motion, image dimensions. Session-memory cart only; no payment. All images original generated assets. Products and prices illustrative.

September 10 explicit refinement: full 100svh hero and second campaign; header overlays opening image. Zero outer margin/padding and zero gaps in category and product grids. Category labels overlay imagery. Mobile: two flush columns with third tile spanning full width; preserve label padding and accessible controls. No new features or imagery.

Header refinement: transparent at top, subtle link underlines, 40px scroll transition, restored scroll position handled on pageshow.

Colour correction: unify interface around neutral off-white and charcoal; eliminate brown focus/hover states, beige story panel and brown scrims. Keep garment photographs unaltered; colour comes from photography. Footer text uses the same off-white token. Standing user instruction: publish Pandiones changes without asking again.

Responsive correction: global images height:auto neutralizes intrinsic HTML heights; campaign images explicitly fill their container. Mobile and portrait tablet <=900px use one campaign image, centered grid header with 44px actions, stacked product modal. Remove fixed 600px hero minimum on portrait phones and index-based last-product spans that broke filtered grids. Short landscape screens retain 420px scene height. Dialogs adapt to dynamic viewport and safe area. Zero grid gutters retained.

Header UI refinement: user requests visible background. Persistent 90% neutral glass surface (98% scrolled), dark text, unified 44px menu/search/bag buttons, compact count badge. Refined menu typography, inset search field with result count, bag separators and consistent close controls; aria-expanded synchronized with native dialog state.

Latest header decision: user requests transparent homepage opening again. Header has no background/blur/border/shadow at scroll top, white controls and inverse count badge over a subtle top-of-hero scrim. Scrolled header remains neutral off-white with charcoal controls; all menu/search/bag usability changes retained.

Animated directional header: scroll down hides header above viewport; scroll up reveals with 360ms easing. 12px directional threshold avoids jitter; top 96px always visible. Open dialogs and keyboard focus keep it visible; reduced-motion disables animation.

Discovery overlays redesigned: wide editorial two-column menu with oversized links and campaign panel; full-height mobile menu. Search uses a large underlined field, selectable suggestions, clear action and three-column visual results (two on mobile), with resettable empty state. Unicode-normalized multiword matching supports Turkish input with or without accents. Native dialog keyboard/focus behavior retained; opening animation respects reduced-motion.

Footer discovery strip: four flush portrait tiles, zero outer margins/gaps/radius, two columns below 800px. Pandiones story and sleepwear links plus native size/fabric guide dialogs. Reuse owned campaign imagery; no unsupported gift-card or account claims.

Footer refinement: charcoal surface, small tracked wordmark, large serif brand statement, two navigational columns including existing guide dialogs, thin divider and restrained locale/back-to-top row. Stacks gracefully on mobile.

Footer second refinement: replace small conventional footer composition with an architectural fashion colophon; monumental serif Pandiones wordmark across the bottom, compact editorial statement above, restrained olive-white ink on near-black, two aligned navigation columns. Existing links and guides retained.

Collection first slice: collection.html, flush large two-column image rows with two/four view controls (compact two columns on narrow mobile), category filtering, existing product dialogs. Added a clearly concept robe product to complete four cards. Homepage collection links route here; session shopping bag preserved across navigation. User will direct subsequent iterations.

Collection correction: two-view mode now means one product per row with paired full/detail gallery panels and one caption. Four-view remains one product image per card. Current second panels are explicit CSS detail crops of the same owned product photo, since separate alternate product photographs are not yet supplied; do not substitute a different product.

Four-view interaction: add responsive outer padding and card gaps. Each compact card becomes a two-image gallery; hover reveals the detail image, while arrows and touch swipe select either view. Two-view retains its flush paired full/detail presentation and hides gallery controls.
