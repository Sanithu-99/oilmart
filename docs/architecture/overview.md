# Architecture overview

## Shape

The application is a modular monolith. Next.js App Router owns rendering and HTTP boundaries; domain modules under `src/features` own business rules; `src/lib` contains infrastructure adapters and cross-cutting primitives. PostgreSQL is the system of record and Prisma is the typed persistence layer.

## Runtime boundaries

- Server Components read through server-only data-access modules.
- Client Components are limited to interactions that require browser state.
- Route handlers and Server Actions validate input, authenticate, authorize, rate-limit, then call domain services.
- Domain services own pricing, inventory, order transitions, loyalty, pre-order, and quotation rules.
- Provider ports isolate email, SMS, storage, maps, monitoring, and future payment gateways.
- Notification records form a durable outbox processed with bounded retries.

## Domain modules

Authentication/RBAC, catalog, inventory, pricing, cart, checkout, orders, customers, loyalty, pre-orders, quotations, delivery, notifications, payments, reporting, content, and audit are separate service boundaries. They share one database transaction manager but not presentation logic.

## Key decisions

- Exact money: `BigInt` minor units.
- Exact measured quantities: PostgreSQL `Decimal(18,3)` and `decimal.js` in application logic.
- Historical accuracy: order lines and pricing JSON are snapshots.
- Concurrency: inventory updates use transactions, version checks/row locking, idempotency keys, and an append-only adjustment ledger.
- Localization: English, Sinhala, and Tamil content uses locale-specific URL segments and translation tables.
- Authentication: stable NextAuth/Auth.js v4 is pinned; v5 was not selected because it remains pre-stable. Administrative authorization is permission-based and enforced inside every mutation.

## Deployment expectation

One web deployment and one background worker deployment can share the same codebase and database. A managed PostgreSQL service, shared rate-limit store, S3-compatible storage, provider credentials, error monitoring, backups, and TLS are required for production.
