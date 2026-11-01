# Security model

## Identity and access

Admin sessions use NextAuth credentials with bcrypt password hashes, signed HttpOnly cookies, an eight-hour maximum age, CSRF-safe mutation handling, expiring single-purpose reset tokens and server-side active-user/permission reloads. Roles map to granular permissions. UI visibility is never treated as authorization; public admin registration does not exist.

Customer credentials use a separate provider and require an active customer profile plus verified email. Customer data access reloads the profile by signed session user ID; order, address, cart and loyalty queries include that customer ID in the database predicate. Password changes increment a session version, and older tokens are revoked on their next request.

Registration, login, verification resend and recovery are persistently rate-limited with HMAC-protected identities. Verification/recovery tokens are random, one-way hashed, purpose-bound, expiring and consumed once. Generic responses do not disclose whether an account exists.

## Data boundary

All untrusted input is validated with Zod and size-limited. Server-only DAL modules prevent browser imports. ORM parameterization prevents raw string SQL injection. Sensitive log fields are redacted.

## Administrative controls

Administrative writes require authentication, permission checks, fresh validation, CSRF-safe same-origin mutation paths, rate limits, and append-only audit records with correlation IDs. Sensitive before/after fields are redacted.

## Web controls

Baseline response headers disable MIME sniffing, framing, unnecessary browser features, and unsafe referrer behavior. A tested CSP will be finalized with the storage/analytics/provider domains. Uploads must verify content type, decoded image content, dimensions, size, and storage ACLs.

## Secrets and providers

Secrets are environment-driven and `.env` is ignored. The owner bootstrap requires environment values, refuses to run once privileged users exist and never prints credentials. Card data and CVVs are never stored. Reset tokens are one-way protected, expire, and never appear in logs. Login and reset limits use persistent PostgreSQL buckets with HMAC-protected request identities.

Email and SMS are provider abstractions, not claimed integrations. With no provider configured, the interface reports unavailability and never claims delivery. `development` adapters may expose preview links/codes only outside production. Configured providers enqueue notifications for a worker; credentials and confirmed delivery remain deployment responsibilities.

Phone OTP values are HMAC-protected at rest, expire after ten minutes, enforce a resend cooldown and stop after five failed attempts. Sri Lankan mobile numbers are normalized to E.164 before storage.

## Data protection

Collect only order/account data required for operations. Terms/Privacy acceptance and optional marketing choices are recorded separately; preference changes append new consent evidence. Customers can request deletion, while transaction records may remain subject to accounting, fraud-prevention and legal retention requirements. Production launch still requires processor agreements and legal review against applicable Sri Lankan data-protection obligations.
