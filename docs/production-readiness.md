# Production readiness

## Not launch-ready

Phases 1–3 are complete. The storefront, multilingual catalogue, guest cart, secure administrative authentication/RBAC, catalogue/content management, transactional inventory, promotion pricing, audit trail and persistent database-backed abuse limits are implemented and tested. Customer authentication, loyalty application workflows, checkout/order submission, notification delivery, external provider credentials, MFA, production content and final security/performance verification remain launch blockers.

## External dependencies

Managed PostgreSQL, S3-compatible storage/public URL, email provider/domain, SMS provider, error monitoring, route-distance provider (if automatic delivery quotes are wanted), hosting/runtime, DNS/TLS, and later a selected payment provider with merchant access. Database rate limiting is implemented; a dedicated distributed limiter may replace it at higher traffic volumes.

## Unresolved business decisions

- Domain and public application URL.
- Opening hours and pickup instructions.
- Delivery coverage, rates, free-delivery threshold, and route provider.
- Loyalty approval/verification/expiry rules.
- Pre-order approval and expiry rules.
- Quotation fee amount and credit/refund policy (disabled).
- Card surcharge legality/contract approval (disabled).
- Offline payment methods and manual verification procedure.
- Tax rules, returns/refunds, privacy, terms, delivery, and warranty policy text.
- Email, social links, brand assets, approved manufacturer logo rights, and production product data/images.
- Administrative users and MFA policy.

## Launch gates

All completion criteria in the brief, passing automation, accessibility/security/performance review, restore drill, provider sandbox verification, legal/privacy review, operational ownership, and final content approval.
