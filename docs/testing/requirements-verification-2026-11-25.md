# Requirements verification - 25 November 2026

Commands used the local Node.js 22.16.0 runtime through pnpm --use-node-version=22.16.0.

## Current checks

- ESLint: passed, zero warnings.
- Unit tests: 79 passed across thirteen files. Coverage includes loyalty estimates, exact measured quantities, document sections and size matching, individual quotation fees, customer/admin authorization, request idempotency, stock reservations and cancellation, amount/reference verification, stale cart/terms consent, hosted-link domain/expiry checks, QR generation, and private phone-backed OTP challenges.
- Browser checks: twelve passed across Chromium desktop and Pixel 7 mobile. Catalogue and route protection checks use the running application read-only. Checkout, owner settings and payment-verification interactions use the actual client components bundled with fake actions in a test-only browser fixture, covering acknowledgement, loading, success, recoverable error, value retention, native selection and narrow-screen overflow.
- Production build: passed, including TypeScript and the customer checkout, customer order-payment, admin order and admin settings routes.
- Strict premium UI audit: zero findings; JSON retained in premium-audit.json.
- git diff --check: passed. The local .env remains ignored.

## Inspection and boundaries

Visual evidence is under ignored test-results/. A stale development stylesheet was resolved by restarting the preview. Form reset behavior was verified after preventing automatic resets from discarding controlled selections on failed actions. Existing CSS variables and panel/button classes remain the visual source of truth.

No production migration, seed, test account, purchase, stock adjustment, bank transfer, SMS or gateway charge was performed. Persistence and external-effect behavior are tested with mocked transaction boundaries. Full PostgreSQL concurrency/rollback integration and authenticated live-provider testing still require an isolated test database and test merchant/device accounts.

The new order flow creates an unpaid draft, requires physical stock confirmation, reserves stock, and only then exposes payment instructions. A customer claim cannot mark paid. Actual-receipt verification requires the exact amount and an authorized reviewer, and commits stock through an idempotent sale ledger. Quotation-service fees have no merchandise lines. Receiving details and accepted quotation terms are snapshotted.

Phone-backed SMS uses the private SMSGate API with a configured device/SIM, scoped credential, HTTPS, expiry and per-user/recipient limits. API acknowledgement means queued, not delivered. OTP plaintext is not persisted; failed delivery invalidates the challenge and successful verification consumes it once. Missing credentials leave delivery unavailable.

## Outstanding launch inputs

- Verified owner bank or registered phone-transfer receiving details.
- Merchant account and real per-order hosted payment links; automatic gateway initiation and callback reconciliation are not enabled.
- Private Android SMS gateway connection, device/SIM selection and token, plus an email delivery configuration for account verification.
- Provider approval of any live card pricing policy. The 4% rule remains an estimate and is not applied to hosted checkout.
- Supplier-approved exact product photos and remaining manufacturer-content verification. The imported catalogue has 130 records without product images; eight checked official Caltex originals are only 250x350 pixels. Some existing family packshots need exact-grade replacement.
- Native-language content review, final delivery/refund policies and separate production readiness checks.

See docs/operations/payments-and-sms.md for owner setup and the completed operational flow. No deployment or GitHub push was performed.
