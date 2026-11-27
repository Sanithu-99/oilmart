# Payments, approvals and phone-backed SMS

## Owner setup

Open `/admin/payments` with `settings.manage`. Cash pickup is available by default. Bank transfers, NTB/FriMi phone transfers and merchant-hosted payments are disabled until the owner enters verified receiving details and explicitly enables them. The shop's contact number is never reused as a payment number automatically.

For hosted payments, enter the exact checkout hostname issued by the merchant provider, without a scheme or path. After confirming an order, generate a payment link in the merchant portal for the exact LKR amount and order number. In `/admin/orders`, select **Add unique merchant payment link**, enter the link and its provider expiry including timezone. Only that configured HTTPS hostname is accepted. No merchant credentials are stored in the dashboard.

Genie/Dialog Pay Business or another approved provider can supply a manual hosted payment link. PayHere now also has automatic signed checkout and a verified callback route; see [gateway integration and activation](../payment-gateway-integration.md). Merchant credentials and explicit owner enablement are still required. Manual bank/phone transfers and manual hosted links continue to require actual incoming-funds verification. The requested 4% card adjustment remains an estimate; it is not attached to hosted payments because the reviewed Genie terms prohibit card-fee pass-through.

## Customer and shop workflow

1. Customer reviews the cart and chooses **Request stock confirmation**. Account checkout requires email verification and a saved mobile number. Guest WhatsApp inquiries remain available.
2. Submission creates an unpaid `DRAFT`. It neither reserves stock nor displays payment instructions. Repeated submission of the same cart returns the existing order. A changed cart, price or quotation revision requires another review.
3. In `/admin/orders`, the shop physically checks stock and confirms the request. A serializable transaction reserves the exact quantities and creates the payment request. Insufficient stock or a stale record blocks confirmation. Receiving details are snapshotted so an account-setting change cannot silently redirect an existing invoice.
4. The customer order page shows the confirmed total, receiving instructions and its unique QR. Where a valid merchant link exists, the QR opens that hosted payment page; otherwise it opens the authenticated order/payment request. This is a payment-link QR, not a guessed LANKAQR payload. Scanning it never marks an order paid.
5. A customer can submit a transfer reference. It changes the payment to **awaiting verification**, without deducting physical stock or treating funds as received.
6. The shop verifies actual incoming funds, enters the exact received amount and transaction reference, and acknowledges verification. Only then does the transaction mark payment paid, commit stock and append the sale adjustment. Duplicate verification cannot deduct stock twice. The same normalized provider reference cannot pay two orders.
7. The shop processes the paid order, marks it ready for pickup, then completes it. Cash is verified when actually collected at the shop. For a zero-value confirmed request, the zero payment is recorded without collecting money.

Unpaid cancellation releases reservations and cancels active payment links. A reported payment must first be resolved: **No receipt found** returns it to payment pending while retaining the claim in history. Paid orders cannot be cancelled through this screen; refunds require a separate reviewed accounting process. There is no invented automatic reservation timeout; the owner closes unpaid requests manually.

Customer history shows public shop notes, status history and payment state. Admin-only notes and other customers' orders stay private. Payment-review writes require `orders.manage`; the queue requires `orders.read`.

## Pre-orders and individual quotation fees

An enabled pre-order first requires shop approval. Once approved, the customer can review the current trusted price and continue to a draft pickup order. Shop approval of the request does not bypass the later physical stock check.

The owner prepares the quotation with its individual fee and terms. The customer explicitly accepts that fee and revision. This creates a **quotation preparation service** invoice, containing no oil product lines. It does not charge for or reserve the requested products. Shop confirmation enables payment; verified receipt updates `feePaid`. Fee invoices can then be completed as a service. Cancelling an unpaid invoice also closes its source request. No blanket fee is assumed.

Delivery remains quotation-based until the shop confirms a delivery charge. The self-service checkout is explicitly store pickup, so no shipping price is invented.

## Using the owner's Android phone for OTPs

The implementation supports the [SMSGate Android/private-server API](https://docs.sms-gate.app/integration/api/). Install and configure the phone application and a private reachable gateway before enabling delivery. The [official setup guide](https://docs.sms-gate.app/getting-started/) explains local and private modes; hosted Vercel functions cannot directly reach a private Wi-Fi phone address.

Server-only configuration:

```dotenv
SMS_PROVIDER=sms-gate
SMS_GATE_URL=https://your-private-gateway.example/3rdparty/v1
SMS_GATE_TOKEN=your-scoped-gateway-token
SMS_GATE_DEVICE_ID=the-registered-phone-device-id
SMS_GATE_SIM_NUMBER=1
```

Use a scoped JWT with message-send permission. Select the correct SIM slot on a dual-SIM phone; the adapter uses that explicit slot when supplied. The adapter uses HTTPS, refuses credential redirects and sends one message with a unique challenge ID, a ten-minute TTL and the selected device. Public-cloud plaintext OTP transmission is intentionally refused; configure a private endpoint. For a localhost adapter test, HTTP is accepted only for `localhost` or `127.0.0.1` outside production.

The code is HMAC-hashed in PostgreSQL and never persisted in notification payloads or logged. Issuing a replacement invalidates older challenges. Resend cooldown and persistent recipient/user limits apply; five incorrect guesses or expiry make a challenge unusable. Successful verification conditionally consumes the challenge once. A gateway failure invalidates the unsent challenge. An API acknowledgement is described as **queued**, not delivered.

`SMS_PROVIDER=development` exposes a development-only preview code outside production. With no supported provider/credentials, the UI says delivery is unavailable. No real SMS was sent during verification. Confirm the SIM plan permits automated transactional use; an unlimited personal package alone does not establish that.

The Resend adapter now delivers new-account verification and customer/admin recovery links when configured. Loyalty application, activation and discount eligibility require both verified email and phone. See [customer verification setup](customer-verification.md). Owner receiving details, merchant credentials, a verified email sender and phone gateway credentials cannot be inferred from database access.

## Verification and deployment

The work uses existing schema tables; no migration or production seed is required. Unit tests mock persistence/external calls. Browser interaction fixtures use the actual client components with fake actions, and live-route checks are read-only. Do not run fake purchases against the configured production Neon database.

Local QR links use local `APP_URL`; a phone cannot reach another computer's `localhost`. Set the deployed application URL for production QR use. Never expose an unprotected development SMS or database service to make a preview reachable.
