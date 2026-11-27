# Production readiness

## Not launch-ready

The 26 November continuation adds automatic PayHere checkout and signed server notifications, phone verification gates for loyalty, real Resend transactional email, reviewed batch catalogue setup, original manufacturer summaries for 88 imported products and ten exact manufacturer photographs. The manual order/payment lifecycle, preorder approval, quotation-service invoices and payment-link QR remain supported. See `docs/requirements-2026-11-26.md` for current completion and `docs/payment-gateway-integration.md` for activation. Production activation still requires verified receiving accounts, merchant onboarding, device/sender configuration and isolated database integration testing.

The storefront, multilingual catalogue, source-section filtering, carts, customer authentication, verified loyalty, secure administrative RBAC, document register, catalogue management, stock-confirmed order submission, transactional inventory, approval workflows and persistent abuse limits are implemented. Remaining launch blockers include verified retail/loyalty prices, the remaining 225 manufacturer descriptions and 121 missing storefront photos, provider credentials and sandbox evidence, isolated database concurrency/rollback testing, production infrastructure ownership, MFA policy, content rights and final accessibility/security/performance review.

## External dependencies

Managed PostgreSQL, S3-compatible storage/public URL, email provider/domain, SMS provider, error monitoring, route-distance provider (if automatic delivery quotes are wanted), hosting/runtime, DNS/TLS, and later a selected payment provider with merchant access. Database rate limiting is implemented; a dedicated distributed limiter may replace it at higher traffic volumes.

## Unresolved business decisions

- Domain and public application URL.
- Opening hours and pickup instructions.
- Delivery coverage, rates, free-delivery threshold, and route provider.
- Final loyalty expiry policy; email, phone verification and shop approval are enforced.
- Pre-order approval and expiry rules.
- Quotation fee credit/refund policy; the owner sets the fee per request.
- Card surcharge legality/contract approval (disabled).
- Offline payment methods and manual verification procedure.
- Tax rules, returns/refunds, privacy, terms, delivery, and warranty policy text.
- Email, social links, approved/current manufacturer logo rights, the supplied Vecteezy footage license/attribution, and production product data/images.
- Administrative users and MFA policy.

## Launch gates

All completion criteria in the brief, passing automation, accessibility/security/performance review, restore drill, provider sandbox verification, legal/privacy review, operational ownership, and final content approval.
