# Database architecture

The initial migration is in `prisma/migrations`. Production uses `prisma migrate deploy`; destructive schema synchronization is not a deployment strategy.

## Major aggregates

- Identity: users, accounts, sessions, verification tokens, roles, permissions.
- Customers: profiles, addresses, loyalty memberships, consent history.
- Catalog: categories/translations, brands, products/translations, variants, images, related products, loose-oil configuration.
- Inventory: one inventory row per sellable variant and an append-only adjustment ledger.
- Commerce: carts/items, orders/items/status history/notes, payments/attempts/refunds.
- Workflows: pre-orders/history and quotations/items/history.
- Merchandising: promotions, category/product targeting, coupons/redemptions.
- Operations: delivery settings/zones, notification outbox, store settings, content, audit logs.

## Integrity rules

Foreign keys use deliberate deletion behavior. Historical order/payment records are restricted from cascading deletion. Public slugs, SKUs, order references, idempotency keys, provider references, and coupon hashes are unique. Search/status/date access paths have indexes.

## Financial and inventory safety

Money is `BigInt` in LKR cents. Quantity is decimal and supports configured increments. Checkout will re-read authoritative prices and inventory inside a transaction. Committing an order and its inventory adjustment must share an idempotency key so retries cannot deduct twice.

## Seed policy

The seed creates system roles/permissions, factual business configuration, eight brief-approved categories, and disabled unresolved pricing rules. It does not create products, specifications, prices, reviews, awards, or provider credentials.
