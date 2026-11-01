# Test plan

## Current

Vitest covers exact decimal quantities, basis-point discounts, standard/loyalty/promotion precedence, disabled surcharges, allowed/forbidden order transitions, Sri Lankan mobile normalization, and OTP expiry/consumption/attempt limits. TypeScript strict mode, ESLint, production build, and Playwright are configured.

Playwright covers public storefront rendering and filters, localized shells, guest-cart mutations, responsive widths, admin authentication/catalog/inventory workflows, and the Phase 4 customer journey. The customer scenario runs on desktop and Pixel-class mobile and verifies guest-cart merge, account access, saved addresses, owned-order access, rejection of unowned order IDs, loyalty application, admin approval, decision visibility and current-stock reorder.

## Planned

- Unit: delivery, inventory, additional promotion edge cases, pre-order and quotation rules.
- Integration: token consumption races, OTP persistence, database constraints, transactional checkout, audit/outbox workers and provider failure/retry behavior.
- Concurrency: simultaneous checkout against scarce stock and duplicate event idempotency.
- E2E: all 24 workflows from the project brief in Chromium and a mobile viewport.
- Non-functional: WCAG 2.2 AA keyboard/screen-reader checks, localized typography, upload abuse, dependency/secret scanning, Lighthouse on production-like pages.

Integration and destructive tests use a dedicated non-production database identified by an explicit guard variable.
