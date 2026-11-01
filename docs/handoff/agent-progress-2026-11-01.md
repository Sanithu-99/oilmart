# Saranankara Oil Mart — AI agent handoff

Snapshot date: 1 November 2026  
Repository: `github.com/Sanithu-99/oilmart`  
Production site: `https://saranankara-oil-mart.netlify.app/en`  
Primary branch: `main`

## Executive status

The project is a production-oriented Next.js commerce application for a Sri Lankan lubricant retailer. Phases 1–4, the supplied inventory report import, product imagery pass, secure admin operations, customer accounts, loyalty pricing and cart pricing propagation are implemented. The current layout is retained with a deep petrol-green, original bright-yellow, warm cream and restrained chili-red palette.

It is not ready for a public transactional launch because checkout/order submission and payment are intentionally disabled, most imported products still require verified retail prices, product content/images need supplier approval, and external delivery/notification/monitoring/legal decisions remain open.

## What has been completed

### 1. Foundation and architecture

- Next.js 16.4, React 19.3, strict TypeScript and Tailwind CSS 4.
- PostgreSQL with Prisma ORM 7, normalized relational schema, migrations, generated client and repeatable seeding.
- Node.js 22 and pnpm 10 pinned for local/Netlify builds.
- Exact monetary values use `BigInt` minor units; measured quantities use exact decimal columns.
- Central environment validation, structured redacted logging, security headers and store configuration.
- Vitest unit tests, Playwright browser tests, lint, typecheck, coverage and production build scripts.
- Architecture, database, API, security, operations, testing, deployment and production-readiness documentation.

### 2. Premium multilingual storefront

- Responsive homepage, product catalogue, product detail and cart experiences.
- English, Sinhala and Tamil route shells, translated core UI and English fallback disclosure for untranslated products.
- Server-rendered product search, category/brand/availability filters, sorting and pagination with URL state.
- Database-backed homepage categories, brands, featured products, new arrivals and promotions.
- Product gallery, technical specifications, current stock, exact quantity steps and related products.
- Local Business/Product structured data, route metadata, alternate locales, sitemap, robots, error/loading/not-found states.
- Guest cart uses a random HttpOnly token whose database identifier is SHA-256 hashed.
- Cart mutations validate current publication, variant, quantity-step and inventory data on the server.

### 3. Administrative operations

- Separate protected `/admin` workspace using credentials, signed sessions, CSRF protection and database-backed throttling.
- Owner, Admin, Inventory Manager, Order Manager and Support roles with granular server-side permission checks.
- Owner bootstrap command, generic password recovery and one-time hashed reset tokens.
- Product/category/brand management, translations, SEO, publication states, images, variants, loose-oil rules and related products.
- Exact standard/loyalty/variant pricing, immutable price history and append-only audit log.
- Inventory receipts/corrections/damage/returns use serializable transactions, version guards and negative-stock rejection.
- Promotion scheduling and deterministic best-price resolution for products/categories and loyalty-only offers.
- Database-backed localized homepage content.
- Product uploads decode and validate image files, strip metadata and convert to optimized WebP.

### 4. Customer accounts and loyalty

- Customer registration/sign-in, verified-email gate, password recovery and session revocation after password changes.
- Terms/privacy acceptance, marketing consent history and privacy deletion requests.
- Editable profiles, saved addresses, customer-scoped order history and current-price/current-stock reordering.
- Sri Lankan phone normalization plus provider-neutral OTP challenges with expiration, cooldown and attempt limits.
- Loyalty applications, administrator decisions, unique member numbers and immutable decision history.
- Verified active members receive eligible loyalty prices and loyalty-only promotions.
- Guest carts merge deterministically after sign-in without silently changing invalid quantities.
- Privacy Policy and Customer Account Terms routes are published.

### 5. Neon and deployment

- Temporary development/production database is hosted on the supplied Neon project/production branch.
- Neon configuration provisions Postgres, Managed Auth, Realtime preview support, the `product-images` object-storage bucket and a protected database health Function.
- The application itself currently keeps its established NextAuth/Prisma identity flow; provisioned Neon Auth is not the application identity provider.
- Neon-compatible S3 object storage is wired into the product image upload service.
- Realtime and AI Gateway environment support is present, but they are not required by the current storefront and are not represented as active user features.
- Netlify builds use Node.js 22 and `pnpm build`; public service URLs are excluded from secret-scan false positives while credentials remain protected.
- GitHub `main` auto-publishes to Netlify.

### 6. Inventory Details Report import

- The supplied PDF/report was normalized into `prisma/data/inventory-products.json` and a repeatable seed process.
- Import result at the catalogue checkpoint: 313 active inventory products, 313 stock rows, 15 active categories and 28 active brands.
- Legacy `SAMPLE-` products are archived instead of being deleted.
- Imported products use stable `INV-` SKUs, normalized slugs, brand/category classification, pack/unit metadata and exact stock quantities.
- 182 imported products have product-image records. Image-source audit data is in `docs/product-image-sources.json`.
- At the import checkpoint, 19 products had an explicit retail price and the remainder deliberately used price `0` / “Contact for price”; no supplier price was invented.
- The import/build/fetch/verification utilities are in `scripts/` and the seed is repeatable.

### 7. Current admin pricing workflow

- The admin overview has an Inventory Details Report readiness panel with dynamic imported-product, image and price coverage.
- A pricing queue links directly to unpriced products with current stock context.
- The Products page filters all / needs-price / price-ready records.
- Authorized admins can quick-edit standard and loyalty prices inline with a mandatory reason.
- Quick edits convert LKR to exact minor units, validate price relationships, reject stale concurrent writes, execute serializably, append `PriceHistory`, append `AuditLog` and revalidate all storefront locales.
- When the displayed default variant has an explicit override, the quick editor propagates the new effective price to that override.
- Full product editing still exposes variant-specific control and warns when a default variant overrides the product price.

### 8. Price propagation contract

- Product listings and detail pages read the current database price, loyalty eligibility and active promotion every request.
- Cart items persist only product ID, variant ID and quantity—not a stale client price.
- Cart presentation recalculates from current database prices and current server-verified loyalty/promotion context.
- Cart JSON responses are private/no-store. Client carts refresh on route navigation, window focus/visibility, cart opening and every 60 seconds.
- A product with no verified price cannot be newly added to cart. If an existing cart product is changed to zero, the UI shows “Price confirmation needed” rather than a free line.
- Completed `OrderItem` rows retain unit-price/line-total snapshots, so later admin edits do not rewrite purchase history.
- Checkout is not yet enabled. The future placement transaction must load and validate the cart again, compute server-authoritative pricing and inventory, and create the order/items/pricing snapshot atomically.

### 9. Visual direction

- The current information architecture and responsive layout are intentionally preserved.
- Blue/yellow cricket colors were removed.
- Current palette: deep petrol green for the header and primary retail actions, the restored bright yellow (`#FFD11A`) for high-visibility highlights, warm cream/sand surfaces and restrained chili red for secondary emphasis.
- The footer retains the large animated “Saranankara Oil Mart” wordmark with the oil movement clipped inside the letters.
- Category tiles use real lubricant product imagery rather than generic icons/AI-style graphics.
- All 28 active catalogue brands appear as a two-row, opposite-direction logo marquee. It pauses for pointer/keyboard interaction, becomes manually scrollable when reduced motion is requested and every primary logo links to its filtered catalogue.
- A compact gold “We Deliver” truck badge sits in the top utility bar without displacing the hotline on mobile.
- The project-owner-supplied oil-flow clip was reduced from 41 MB/1440p to a 2.9 MB, silent, 14-second 720p web loop. It is masked inside the footer wordmark, has a poster frame and falls back to still golden-oil lettering for reduced-motion or mask-incompatible browsers.
- Brand and footage provenance/approval notes are recorded in `docs/assets/brand-logo-sources.md`. Four ambiguous report-category brands use exact-name lockups pending supplier-confirmed official assets.

## Security and data boundaries that must remain

- Never accept browser-submitted prices as authoritative.
- Preserve integer minor units for money and exact decimals for quantity.
- Keep authorization inside every server action/route; hiding UI is not authorization.
- Keep completed order snapshots immutable.
- Keep inventory adjustments append-only and transactional.
- Do not commit `.env` or credentials. Rotate any development credentials that were ever pasted into chat, screenshots or logs before handoff/launch.
- The current Neon account/database is temporary. Handoff must use a new owner-controlled account/database and a tested migration/restore procedure.

## What must be done next

### Immediate catalogue work

1. Enter and verify the remaining retail prices through `/admin/products?pricing=missing`.
2. Confirm whether every retail price is tax-inclusive and approve loyalty-price rules.
3. Validate imported stock against a fresh physical/report count before launch.
4. Obtain supplier/manufacturer approval for product names, pack sizes, technical claims, compatibility and every product image.
5. Replace any weak/incorrect image and complete missing imagery.
6. Confirm manufacturer permission/current logo artwork and the supplied Vecteezy footage license/attribution before public launch.

### Transactional commerce

1. Design and implement checkout contact/address/fulfillment selection.
2. Implement a serializable order-placement transaction with current-price/current-stock validation, inventory reservation/commitment and idempotency.
3. Add pickup and delivery rules, coverage, fees, quote workflow and customer confirmation.
4. Decide payment methods; integrate and sandbox-test the selected provider only after merchant approval.
5. Complete admin order, payment verification, cancellation, refund and fulfillment workflows.

### Providers and operations

1. Configure transactional email, SMS, error monitoring and background notification delivery.
2. Decide admin MFA policy and implement user-management/provisioning beyond the initial bootstrap.
3. Migrate Neon database/object storage to the final owner-controlled account, verify row/file counts and perform a restore drill.
4. Rotate all database, object-storage, realtime, auth, function and application secrets.
5. Configure the final domain, DNS/TLS, opening hours, pickup instructions and social/contact data.

### Launch assurance

1. Complete legal review of privacy, terms, tax, delivery, warranty, returns and refunds.
2. Run accessibility, keyboard, screen-reader, contrast and reduced-motion testing.
3. Run production performance/Lighthouse and image-loading review against real catalogue traffic.
4. Run dependency/security review, abuse/rate-limit tests and a backup/restore drill.
5. Execute full desktop/mobile regression, provider sandbox tests and final business-owner acceptance.

## Verification commands

```bash
pnpm check
pnpm build
pnpm test:e2e
pnpm db:migrate:deploy
pnpm db:seed
```

Run database/deployment commands only with the intended environment loaded. Never paste shell commands into a SQL console.

## Latest verification evidence — 2026-11-01

- `pnpm check`: passed ESLint, strict TypeScript and all 14 unit tests.
- `pnpm build`: completed the optimized Next.js 16 production build and generated all 70 static route variants.
- `pnpm test:e2e`: all 20 Playwright tests passed on desktop Chromium and mobile Chrome emulation in 2.2 minutes.
- The admin E2E workflow created a product, received 5.5 units, added it to a guest cart, changed its price from LKR 1,250.50 to LKR 1,450.50, verified the existing cart repriced, and archived the product.
- `pnpm db:migrate:deploy`: found all three migrations applied with no pending migration.
- `pnpm exec tsx scripts/verify-catalogue.ts`: 313 active inventory products, 8 archived samples, 182 products with images, 19 priced products, 15 categories, 28 brands and 313 stock rows.
- Desktop and 390 px mobile browser captures were inspected for the brand marquee, delivery badge and footer video-mask treatment.
- Known non-blocking warning: the final database URL should explicitly use `sslmode=verify-full` before the future `pg` connection-string semantic change.
