# Design QA

## Source and implementation

- Approved source: `docs/design/12ui/screens/homepage-first-viewport.png`
- Supporting source screens: `docs/design/12ui/screens/homepage-continuation.png`, `catalog.png`, `product-detail.png`, and `cart.png`
- Implemented routes: `http://127.0.0.1:3000/en`, `/en/products`, `/en/products/sample-engine-oil-5w-30-4l`, and `/en/cart`
- Final desktop capture: `docs/design/12ui/verification/home-first-viewport-final.png`
- Same-canvas comparison: `docs/design/12ui/verification/home-comparison-final.png` (approved source on the left, implementation on the right)
- Additional evidence: `docs/design/12ui/verification/home-desktop.png`, `home-mobile.png`, `catalog-desktop.png`, and `product-desktop.png`
- 12UI implementation audit: `docs/design/12ui/improvement`

## Viewports and rendering

- Approved source: 1536 × 1024 pixels.
- Final desktop comparison capture: 1440 × 1024 CSS pixels at device pixel ratio 1.
- Desktop full-page captures: 1440 × 1100 viewport at device pixel ratio 1.
- Mobile capture: Pixel 7 profile, 412 × 915 CSS pixels at device pixel ratio 2.625; raster capture is 1082 pixels wide.
- Automated horizontal-overflow checks: 320, 375, 430, 768, 1024, 1440, and 1920 CSS pixels.
- Catalogue, product, and cart overflow checks: 320, 768, and 1920 CSS pixels.

## Comparison history

1. Initial browser capture preserved the visual language but used a 720-pixel hero, pushing most category navigation below the approved first viewport. The header search field also compressed because two auto margins competed in the flex row.
2. The 12UI audit confirmed the source proportions and search-field width. The live page retained its original brand-neutral imagery and database content, while the hero was reduced to 560 pixels and the search field was allowed to consume the intended middle column.
3. Final side-by-side review confirms the approved hierarchy, serif/sans range, amber action color, warm photographic surface, whitespace, navigation rhythm, five-column category strip, and first-viewport density. Differences are intentional: the implementation uses original brand-neutral photography, real configured business information, database categories, and explicit sample-data disclosure instead of generated brands, claims, or promotions.

## Interaction verification

- Root route redirects to `/en`.
- Catalogue category and availability filters round-trip through URL parameters and server queries.
- Sinhala and Tamil routes render translated core interface text and the correct root `lang` attribute.
- Language switching preserves the current route path.
- Product quantity controls respect minimum, step, and live available inventory.
- Guest cart add, drawer display, full-page display, quantity update, reload persistence, and removal pass on desktop and mobile.
- Cart mutations recalculate against current database price and stock; loyalty pricing is not exposed to guests.
- Mobile navigation, filters, product layouts, and cart layouts have no horizontal overflow at the required widths.
- Homepage console-error capture returned no errors.

## Automated results

- `pnpm check`: passed — lint, strict TypeScript, and 7 unit tests.
- `pnpm build`: passed — Next.js 16.4 production build.
- `pnpm test:e2e`: passed — 10 desktop/mobile browser tests.
- 12UI improve stages: capture, conversion, and plan settled; low-overlap notice was 59.3% versus a 60% plan threshold because real database content intentionally differs from generated concept content.

## Final result

passed

---

# Phase 3 admin design QA

## Evidence

- Approved overview: `docs/design/12ui/screens/admin-overview.png` (1536 × 1024).
- Approved catalogue: `docs/design/12ui/screens/admin-catalog.png` (1536 × 1024).
- Implemented overview: `docs/design/phase3/admin-overview-implementation.png` (1536 × 1024).
- Implemented catalogue: `docs/design/phase3/admin-catalog-implementation.png` (1536 × 1024).
- Same-canvas comparisons: `docs/design/phase3/admin-overview-comparison.png` and `admin-catalog-comparison.png`, approved source on the left and implementation on the right.
- 12UI kits: `docs/design/phase3/12ui-overview` and `docs/design/phase3/12ui-catalog` (local evidence, git-ignored because the kits contain generated intermediate assets).
- Verified route: `http://127.0.0.1:3000/admin/login`.

## Iteration history

1. P1 — the first automated evidence capture showed the sign-in gate instead of the authenticated workspace because the visual test navigated before the session redirect completed. The test now waits for `/admin` before any viewport or screenshot assertion.
2. P1 — the long-running development process retained a pre-migration Prisma singleton and failed on the newly generated `SlugRedirect` client property. Restarting the development process loaded the current generated client; the production build was already correct.
3. P2 — the approved screens include concept-only orders, customers, reports and rich product-detail split panes. The implementation keeps the same warm editorial system but limits navigation to completed, working Phase 3 modules and routes editing to a dedicated responsive product editor. No fabricated workflows or metrics were introduced.
4. P2 — the approved overview uses concept photography and generated task counts. The implementation uses live paid revenue, product, inventory, pre-order, quotation and audit data instead. Its intentional empty space is a truthful operational state, not a missing placeholder.

## Final severity review

- P0: none. Authentication, navigation, primary actions, tables and forms are visible and operable.
- P1: none. Desktop and mobile automation confirms no horizontal overflow at 320, 768 and 1536 CSS pixels; the end-to-end admin-to-storefront workflow passes on desktop and Pixel-class mobile.
- P2: accepted intentional differences listed above. Typography, warm ivory palette, amber action color, line icons, sidebar proportions, dense information surfaces and status treatments align with the approved direction.
- 12UI: both target conversions and plans settled. Both token patches report no recurring CSS-capable deltas. The plans are unanchored because authenticated screenshots were used, so generated raster fragments were not imported over live components.

final result: passed
