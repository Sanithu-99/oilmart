# Saranankara Oil Mart

Production-oriented commerce platform for a Sri Lankan automotive lubricant retailer. The project is a modular Next.js application backed by PostgreSQL and Prisma.

## Current status

Phases 1–4 are implemented: the application includes a responsive, database-backed storefront in English, Sinhala, and Tamil; URL-driven catalogue filtering; product pages; inventory-aware guest and customer carts; verified customer accounts; saved addresses and order history; loyalty applications and eligible pricing; SEO metadata; and a secure RBAC administrative workspace for catalogue, images, pricing, stock, promotions, loyalty decisions, homepage content and audit history. Approved screens and implementation evidence are preserved under `docs/design/12ui`, `docs/design/phase3`, and `docs/design/phase4`.

The supplied Inventory Details Report has been normalized into the live catalogue. Legacy sample products are archived, imported stock is database-backed, and products without a verified retail price use a call-to-confirm flow. Compatibility recommendations are removed from customer-facing discovery, specifications and imported title suffixes. Stock-confirmed checkout supports cash, manual bank/phone transfers, per-order payment-link QR codes, approved preorders and owner-set quotation-service fees. Automatic PayHere checkout and signed callbacks, private Android SMS delivery, Resend email and phone-verified loyalty are implemented and require real owner/provider configuration. `/admin/launch` shows outstanding setup and previews reviewed batch loyalty-price/preorder changes. See [current requirements](docs/requirements-2026-11-26.md), [gateway activation](docs/payment-gateway-integration.md), and [verification setup](docs/operations/customer-verification.md).

## Requirements

- Node.js 22
- pnpm 10
- PostgreSQL 15, either through Docker or a local server

## Setup

1. Copy `.env.example` to `.env` and replace the development-only secrets.
2. Start PostgreSQL with `pnpm db:up` (requires a running Docker daemon).
3. Run `pnpm db:migrate`.
4. Run `pnpm db:seed`.
5. Run `pnpm dev` and open `http://localhost:3000/en`.

To create the first administrator, follow `docs/operations/admin-guide.md`. The one-time bootstrap is `pnpm admin:bootstrap` and requires all `ADMIN_BOOTSTRAP_*` environment values.

For a native PostgreSQL installation, use port `55432` or update `DATABASE_URL`.

## Quality commands

- `pnpm check` — lint, TypeScript, and unit tests
- `pnpm build` — production build
- `pnpm test:e2e` — Playwright browser tests
- `pnpm test:coverage` — unit-test coverage
- `pnpm db:studio` — Prisma Studio

## Important boundaries

- Money is stored in integer minor units; measured quantities use exact decimals.
- Browser-submitted prices are never authoritative.
- Guest cart tokens are random, stored only in an HttpOnly cookie, and persisted in PostgreSQL as SHA-256 hashes.
- Cart mutations reload current product price and inventory before accepting a quantity.
- Loyalty prices require an active, unexpired membership and verified email and phone, checked on the server.
- Card surcharge support is modeled but disabled.
- Individually accepted quotation fees can be collected after shop confirmation; merchandise is billed separately.
- Distance-based delivery quoting is disabled until a route provider is configured.
- No live payment, email, SMS, object-storage, or monitoring provider is represented as configured.

See [architecture](docs/architecture/overview.md), [security](docs/security/security-model.md), and [production readiness](docs/production-readiness.md).
