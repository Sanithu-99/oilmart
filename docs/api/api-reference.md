# API reference

No public API is committed in Phase 1. Route handlers will live under `src/app/api` and are versioned by resource semantics rather than exposing database models.

Every endpoint/action will return a correlation ID and structured errors, validate with Zod, authenticate/authorize server-side, and be covered by integration tests. Planned resources include catalog search, cart, checkout, account, orders, loyalty applications, pre-orders, quotations, uploads, and protected administrative operations.

Payment webhooks will be provider-specific and are not created until official provider documentation and merchant credentials are available.
