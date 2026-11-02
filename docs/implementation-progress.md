# Implementation progress

## Phase 1 — Architecture and foundation: complete

- Next.js 16.4 / React 19.3 / TypeScript strict / Tailwind 4.3 scaffold.
- shadcn/ui initialized for React Server Components with the project token palette preserved.
- PostgreSQL 15 + Prisma 7 normalized schema, migration, generated client, and repeatable seed.
- Environment validation, structured redacted logging, central store configuration, security headers.
- Vitest, Playwright, coverage, lint, typecheck, and production build scripts.
- Exact pricing primitives and explicit order state machine with seven passing tests.
- Architecture, security, testing, deployment, operations, and readiness documentation.

## Verified

- Prisma schema validates.
- Initial migration applied to a local PostgreSQL database.
- Seed completes repeatedly without duplicate records.
- Unit tests and TypeScript pass.
- ESLint, production build, and Playwright desktop/mobile smoke tests pass.

## Design checkpoint: complete

Four original homepage candidates were generated and visually inspected. Direction A was selected for its balance of premium editorial presentation and useful commerce discovery. It is the Phase 2 target after removing generated performance claims and binding all categories/content to database records.

The selected direction was branched into homepage continuation, catalog, product detail, cart, checkout, account/loyalty, admin overview, and admin catalog screens. All source screens are preserved in `docs/design/12ui/screens`.

Four responsive prototype packages were published and polished. The remote conversion service failed transiently for the homepage package (`fetch failed`) and cart/checkout package (`temporarily unavailable`, explicitly not charged). These failures do not block implementation because their approved source screens are present; they are recorded in `docs/design/12ui/run-summary.json` and must be checked during the required post-implementation 12UI improve pass.

## Phase 2 — Premium storefront: complete

- Direction A visual language implemented with original brand-neutral hero and product photography.
- PostgreSQL-backed homepage sections, categories, brands, featured products, new arrivals, and active-promotion handling.
- Server-rendered catalogue search, filters, sorting, pagination, URL state, empty states, and mobile layouts.
- Product pages with gallery treatment, specifications, inventory, quantity controls, manual-first related products, and category fallback.
- Guest cart drawer and full page with secure cookie persistence, exact quantities, current-price/current-stock validation, update, reload persistence, and remove flows.
- English, Sinhala, and Tamil route shells, translated core interface copy, language attributes, alternates, and English fallback disclosure for untranslated product records.
- Per-route metadata, product JSON-LD, local-business JSON-LD, sitemap, robots policy, loading, not-found, and error states.
- Responsive browser verification at desktop and Pixel-class mobile viewports.

## Verified

- `pnpm check` passes lint, strict TypeScript, and 7 unit tests.
- `pnpm build` completes with Next.js 16.4.
- `pnpm test:e2e` passes 10 desktop/mobile checks covering data rendering, filters, locale attributes/copy, the complete guest-cart mutation flow, and required responsive widths.
- Visual captures and the side-by-side approved/implemented comparison are in `docs/design/12ui/verification`.

## Phase 3 — Administrative operations and catalogue management: complete

- Credentials-based admin authentication using the existing NextAuth/Prisma identity architecture, short-lived signed sessions, CSRF protection, protected routes, logout, generic password-reset requests, one-time hashed reset tokens, and a one-time environment-driven owner bootstrap.
- Server-side RBAC for Owner, Admin, Inventory Manager, Order Manager and Support roles with granular permission checks on every administrative action.
- Persistent PostgreSQL rate-limit buckets for login and password-reset abuse controls.
- Live dashboard metrics, priority stock queue and recent append-only audit activity.
- Product create/edit/publish/archive, multilingual content, SEO, exact standard/loyalty prices, immutable price history, variants, fractional quantity rules, image management, related products and storefront revalidation.
- Category hierarchy/translations/SEO/slug redirects and brand management.
- Serializable, optimistic-versioned inventory adjustments that reject negative stock and record actor, before/after quantity, reason and type.
- Scheduled product/category promotions with server validation, deterministic best-price selection, loyalty eligibility and zero-floor totals.
- Database-backed localized homepage hero publishing.
- S3-compatible product-image storage with decoded-image verification, size/dimension limits, metadata stripping and WebP optimization; development-only local fallback.
- Responsive administrative overview, catalogue, editors and management pages aligned to the approved Phase 3 design targets.

## Phase 3 verification

- `pnpm check` passes lint, strict TypeScript and pricing/state-machine unit tests.
- `pnpm build` completes with all admin/auth routes included.
- `pnpm test:e2e` covers unauthorized redirects, sign-in, product creation/publication, storefront visibility, fractional inventory adjustment, archive/storefront removal and representative admin widths on desktop and mobile.
- Phase 3 visual evidence and same-canvas comparisons are in `docs/design/phase3`; `design-qa.md` records the P0/P1/P2 review.

## Phase 4 — Customer accounts and loyalty: complete

- Separate customer credentials sign-in layered onto the shared identity store, verified-email gate, bcrypt password policy, signed HttpOnly sessions, database-backed throttling and session-version revocation after password changes.
- Registration with explicit Terms/Privacy acceptance, optional email/SMS consent records, single-use hashed verification/recovery tokens, generic recovery responses and development-only preview links.
- Account overview, editable profile, saved addresses, customer-scoped paginated orders, current-price/current-stock reorder and privacy deletion requests.
- Sri Lankan mobile normalization plus provider-neutral OTP challenges with protected codes, expiry, resend cooldown and attempt limits.
- Loyalty application, administrator decisions, unique member numbers, append-only decision history and audited transitions.
- Active loyalty prices and loyalty-only promotions wired consistently through storefront and authenticated cart presentation, with deterministic server-authoritative lowest-price selection.
- Deterministic guest-cart merge after sign-in, preserving valid quantities while returning stock/product conflicts instead of silently changing quantities.
- Responsive authentication, account, order, address, security, preferences and loyalty experiences aligned with the approved account/loyalty design.
- Privacy Policy and Customer Account Terms published in the storefront.

## Phase 4 verification

- `pnpm check` passes lint, strict TypeScript and 14 unit tests, including phone normalization, OTP lifecycle and loyalty/promotion precedence.
- `pnpm build` completes with all customer, account, admin-loyalty and cart-merge routes.
- Playwright verifies the customer workflow on desktop and Pixel-class mobile: access redirect, sign-in, guest-cart merge, address CRUD, order isolation, loyalty application/admin approval and reorder.
- Phase 4 visual evidence and the 12UI target closeout kit are stored in `docs/design/phase4`.

## Inventory catalogue and pricing operations: complete

- The supplied Inventory Details Report was normalized into a repeatable 313-product import with 313 stock records, 15 active categories and 28 active brands; legacy sample products are archived.
- The Inventory Details Report now also has a 326-row, page-referenced source register in the admin workspace. The Caltex revision effective 26 October 2026 contributes 205 further source rows across all 30 printed application groups.
- Every active inventory product is classified by one or more vehicle/application types. Customers can filter by these types, and admins can filter or edit the same classifications.
- 55 exact product-and-pack Caltex matches receive the document's VAT-inclusive gross retail price. Different grades, packs, cartons, drums and loose-oil units are deliberately left unmatched; no price is guessed.
- Retail is the only imported selling price. Caltex wholesale values and inventory unit/total costs are absent from the schema, source data UI and storefront.
- Imported catalogue records use stable `INV-` SKUs, pack/unit metadata, exact decimal stock quantities, active publication state and the call-to-confirm flow when a verified retail price is unavailable.
- 182 imported products have audited product imagery. Image provenance is recorded in `docs/product-image-sources.json`; final supplier approval remains a launch gate.
- The admin overview now treats the report as an operating queue: it shows image coverage, retail-price completion, missing-price count and the next products requiring verification.
- The product table supports price-readiness filtering and authorized quick price updates with exact minor-unit conversion, validation, optimistic concurrency, serializable transactions, immutable price history and append-only audit events.
- Storefront product pages, listings and active carts all read the current database price. Active cart state is refreshed on navigation, focus, cart opening and a periodic interval. Products whose price is changed to zero become confirmation-required rather than free.
- Completed order lines remain immutable price snapshots. Checkout/order submission is still intentionally disabled; its future implementation must reprice server-side and create the order snapshot atomically.
- The approved layout is retained with a slightly lighter petrol-green system, the original bright yellow (`#FFD11A`), warm cream surfaces and restrained chili-red accents. Product imagery is normalized to remove excessive source whitespace, so the packs read clearly in cards and category displays.
- Confirmation-only products now present equal-width Call and WhatsApp actions. Cart and drawer WhatsApp actions open the store chat with product names, SKUs, quantities, current price state and totals already filled in; customers still review and send the message in WhatsApp.
- The available-brand area now uses all 28 catalogue brands in an accessible, two-row moving logo wall, while the top utility strip carries a responsive “We Deliver” badge.
- The supplied oil-flow footage is optimized to a 2.9 MB silent web loop and masked inside the footer wordmark, with poster and reduced-motion fallbacks. The full footer was compacted and rebalanced for desktop and mobile. Asset provenance and remaining logo/license approval are documented in `docs/assets/brand-logo-sources.md`.

## Next phase

Enter and approve the remaining retail prices; manually review unmatched source rows; complete supplier image/specification approval; implement checkout/order submission, fulfillment and payment flows; configure real email/SMS/monitoring credentials; decide MFA policy; migrate from the temporary Neon account to the handoff database; rotate exposed development credentials; and complete the final legal, accessibility, security, performance and launch review.
