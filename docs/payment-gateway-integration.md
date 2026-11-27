# Automatic PayHere payments

The application implements the official [PayHere Checkout API](https://support.payhere.lk/api-%26-mobile-sdk/checkout-api). It posts to the provider's hosted checkout and processes signed form notifications at `/api/payments/payhere/notify`. It never collects card numbers or CVVs. Genie remains available through owner-issued hosted links; no undocumented Genie API is invented.

## Activation

1. Obtain a PayHere merchant account and the merchant secret approved for the actual application domain. Sandbox and live accounts must use their corresponding credentials.
2. Configure server-only `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, and `PAYHERE_MODE=sandbox` or `live`. No secret goes into the dashboard or browser. `APP_URL` must point to the actual application; live mode requires HTTPS. The notification URL must be publicly reachable, including for sandbox callback testing. Another device cannot reach this computer through `localhost`.
3. In owner payment settings enable hosted payment and set the exact hostname: `sandbox.payhere.lk` for sandbox or `www.payhere.lk` for live. Enablement and hostname must match both current settings and the receiving-details snapshot on the confirmed order. Old orders confirmed for another provider are not silently rerouted.
4. Use a separate test database and sandbox merchant account to verify successful, cancelled, failed and duplicate callbacks before production enablement. Do not run test purchases against the production Neon database.

## Customer flow

Checkout creates an unpaid draft. Only after shop stock confirmation and reservation does the order page offer automatic PayHere checkout. The customer provides their real billing name, address and city and acknowledges that those details go to PayHere. This does not convert pickup to delivery. A signed checkout request uses the exact confirmed amount and currency; the server keeps the secret private. Each attempt has a unique UUID sent as the merchant order ID. Repeating preparation reuses the same pending attempt.

The customer explicitly continues to PayHere. Sandbox mode is prominently labelled as a test. A browser return or cancellation cannot mark an order paid. The order page must receive the provider callback first; customers can refresh it to read the current server-confirmed state.

## Notification verification

The route accepts bounded form-encoded bodies and rejects duplicate fields, malformed parameters and invalid signatures. It verifies the documented MD5 checksum using a constant-time comparison, then independently checks merchant, mode, existing attempt, exact amount, LKR currency, payment method and stock-confirmed open order. A serializable transaction records the unique provider reference, marks the attempt and order paid, updates an accepted quotation fee if applicable, and commits stock through the existing idempotent sale ledger. The payment table's provider/reference constraint prevents reuse across payments. Failed transactions return a retryable 503, not a false acknowledgement.

A duplicate success does not deduct stock again. Pending, cancellation and failure notifications do not record funds or release reservations. Paid orders cannot be downgraded by later failure/refund notices. A success arriving after cancellation is logged for manual reconciliation and does not reallocate stock. Refund and reconciliation notices appear in the audit log and require an accounting review; no automatic refund or restock is invented.

No 4% card adjustment is added to actual provider charges. Provider-approved pricing policy is required independently; reviewed Genie merchant terms prohibit passing card-processing fees to customers.

Implementation/unit verification does not imply live merchant activation. The configured local environment has no PayHere merchant credentials as of this change; no real payment or callback was submitted.

## Native LANKAQR boundary

The current [CBSL LANKAQR Specification v1.3 / Circular 02 of 2026](https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/laws/cdg/psd_circular_no_02_of_2026_e.pdf) reserves network fields and refers implementers to the relevant network-facilitator specifications. A bank-issued merchant template and the acquirer's approval of dynamic conversion or its issuing API are required before adding a native bank-scannable generator. A generic EMV payload and valid CRC alone do not establish that approval. See [native LANKAQR provider requirements](lankaqr-provider-requirements.md). No unsupported native-code activation flag was added; per-order payment-link QR remains implemented and clearly labelled.
