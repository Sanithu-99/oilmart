# 12UI design targets

Direction A was selected from four original candidates. It combines a strong product still life, prominent search, multilingual controls, clear commerce actions, and immediate category discovery.

## Screen targets

- `homepage-first-viewport.png` — approved visual baseline.
- `homepage-continuation.png` — database-driven merchandising and footer.
- `catalog.png` and `product-detail.png` — continuous public catalog flow.
- `cart.png` and `checkout.png` — guest-friendly offline checkout flow.
- `account-loyalty.png` — account, orders, and loyalty application.
- `admin-overview.png` and `admin-catalog.png` — professional operations UI.

## Content correction policy

Generated imagery is a design target, not verified business content. Implementation must replace performance language, sample products, prices, stock counts, metrics, and any unconfigured categories with factual database content or honest empty/configuration states. Do not reproduce generated claims such as product performance or coverage.

## Conversion status

All eight screen images succeeded. Responsive HTML packages succeeded for catalog/product detail, account/loyalty, and both admin states. The remote service transiently failed the homepage and cart/checkout package conversions. `run-summary.json` is the authoritative record; `polish-report.json` records the deterministic prototype polish pass.

After implementing each route, run `12ui improve <implemented-url> --target <matching-screen.png> --repo <repo> --out-dir <kit>`, apply the kit, and compare relevant desktop/mobile widths while preserving real functionality and factual content.

## Phase 2 implementation evidence

The storefront was implemented against Direction A and audited again after browser integration. Final desktop/mobile captures and the same-canvas approved-versus-implemented comparison are stored in `verification/`. The reproducible local 12UI improve kit is generated under `improvement/` and intentionally git-ignored because it contains large derived conversion artifacts; its conclusions are recorded in the repository-root `design-qa.md`.
