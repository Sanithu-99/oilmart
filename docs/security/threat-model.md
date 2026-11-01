# Threat model

## Assets

Customer identity/contact/address data, sessions, administrative privileges, catalog/pricing, inventory, orders, payment status, audit history, and provider credentials.

## Principal threats and controls

- Account takeover: rate limits, secure password hashing, verification-token scope/expiry, session rotation, optional admin MFA.
- Broken access control: centralized permissions plus resource-ownership checks in each action.
- Price/inventory tampering: server recalculation, transactions, exact arithmetic, immutable snapshots, idempotent ledger entries.
- Overselling/races: locked/versioned inventory updates and concurrency tests.
- Injection/XSS: schema validation, ORM parameterization, React escaping, CSP, sanitized rich content.
- CSRF/session fixation: same-origin protected mutations, secure cookie settings, rotation after authentication.
- Upload abuse/SSRF: decoded-image validation, allowlisted storage operations, no arbitrary URL fetch.
- Notification abuse/PII leakage: consent separation, recipient validation, bounded retries, log redaction.
- Privileged insider changes: least privilege and tamper-resistant append-only audit records.

## Residual risks before launch

Provider-specific webhook verification, managed infrastructure hardening, shared rate limiting, production CSP, penetration testing, backup restoration drills, and privacy/legal review remain required.
