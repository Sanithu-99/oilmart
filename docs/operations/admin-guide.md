# Administrator guide

The administrative workspace is available at `/admin`. There is no public registration path.

## First owner

1. Run `pnpm db:migrate:deploy` and `pnpm db:seed`.
2. Set `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` (at least 14 characters), and `ADMIN_BOOTSTRAP_NAME` in the operator environment. Do not commit or print them.
3. Run `pnpm admin:bootstrap` once.
4. Remove the bootstrap values from the environment.

The command refuses to run if an Owner or Admin already exists and never logs the password. Additional users must be provisioned through a controlled operator workflow until user administration is added.

## Roles

- Owner: every permission, including sensitive settings.
- Admin: operational permissions except owner-only settings.
- Inventory Manager: dashboard/catalog read and inventory adjustment.
- Order Manager: order, pre-order and quotation operations plus catalogue/inventory read.
- Support: dashboard, catalogue/order/customer read and customer/loyalty support.

UI visibility is not authorization. Every server action reloads the active user, roles and permissions before writing.

## Catalogue operations

- Create products as drafts; add translations, SEO, price, quantity rules, images and related products before publishing.
- Price edits create immutable history with actor and reason.
- Archives remove products from storefront queries without destroying historical records.
- Slug changes create redirects for product detail and category-filter traffic.
- Image uploads accept JPEG, PNG, WebP or AVIF up to 5 MB and 320–8,000 pixels. Files are decoded, rotated, stripped and converted to WebP. Production requires S3-compatible configuration including `S3_PUBLIC_URL`; local files under `public/uploads` are development-only.

## Inventory

Record receipts, damage, returns or corrections as signed decimal deltas with a specific reason. The service uses a serializable transaction and version guard, refuses negative on-hand stock and writes an immutable adjustment plus audit event. Do not edit inventory rows directly.

## Password recovery

Reset requests always return the same public response. A configured email adapter must deliver the raw one-time link; only its SHA-256 digest is stored, it expires after 30 minutes and is consumed on use. Tokens and passwords are never logged. Until an email adapter is configured, an operator must use the controlled account-recovery procedure rather than extracting tokens from the database.

## Remaining launch configuration

Before launch the owner must configure opening hours, pickup instructions, delivery coverage/fees, policy text, social links, email/SMS/storage/monitoring providers, loyalty approval rules, pre-order rules, quotation terms, low-stock thresholds, notification templates and an MFA policy.
