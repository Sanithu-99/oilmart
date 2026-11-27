# Customer verification and loyalty

Loyalty application, owner activation and price eligibility now require an email-verified account with a phone number and a successful SMS verification timestamp. Existing membership records remain intact; an active member without phone verification receives ordinary pricing until verification succeeds. The server checks the same policy in catalogue pricing, cart pricing and checkout. A submitted application still needs shop approval.

Customers use **Account → Security & verification** to request a phone OTP and enter it. The loyalty page links directly to that screen and explains missing verification rather than submitting an application that cannot succeed. SMSGate continues to require a private reachable Android gateway and configured phone/SIM. No phone, API token or receiving number is inferred from store contact details. See [payments and SMS setup](payments-and-sms.md).

## Transactional email

Set server-only configuration for Resend:

```dotenv
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM=Oil Mart <accounts@your-verified-domain.example>
```

Use a sender from a domain verified in your Resend account. `APP_URL` must be the actual application origin; production action URLs require HTTPS. The adapter posts to Resend's fixed HTTPS endpoint, refuses redirects, uses a ten-second timeout and an opaque idempotency key, and requires a provider message ID before reporting acceptance. Provider acceptance is not proof of inbox delivery.

Registration, verification resend, customer password reset and administrator password reset use the adapter. Missing configuration and provider failures do not claim an unsent outbox record is delivered. Development previews are available only when explicitly configured outside production.

Only token digests are stored in verification records. Notification metadata stores the provider and message ID; raw verification/reset links are not stored in the outbox or printed. The one-time link is transmitted only to the configured transactional provider and intended recipient. Recovery and resend responses avoid revealing whether an address has an eligible account. Consuming a link uses a conditional delete; a repeated or expired link cannot update a password. Administrator password recovery also increments the session version to invalidate old sessions.

Owner setup and tests are separate: no real email or SMS was sent while implementing this feature. Configure sender-domain DNS, the phone gateway and production environment values, then perform an owner-approved delivery check.

Official API reference: [Resend Send Email](https://resend.com/docs/api-reference/emails/send-email).
