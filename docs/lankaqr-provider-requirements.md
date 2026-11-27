# Native dynamic LANKAQR: provider requirements

Reviewed 26 November 2026. The existing per-order QR opens a confirmed payment request or a merchant-hosted payment page. It is not a native bank-scannable LANKAQR payload.

The current primary standard is [CBSL Payment and Settlement Systems Circular No. 02 of 2026, LANKAQR Specification v1.3](https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/laws/cdg/psd_circular_no_02_of_2026_e.pdf). Its indexed sections reserve merchant-account fields for LankaPay and refer implementers to network-facilitator specifications. Section 1.8 makes the additional-data reference label mandatory with a maximum of 25 characters. The base standard is [EMVCo Merchant-Presented Mode v1.1](https://www.emvco.com/documents-search/?post_id=12643&type=specifications). Public primary material alone does not verify this shop's merchant identifiers or establish that changing a bank-issued static QR into a dynamic one is supported by its acquirer.

[LankaPay's official participant guidance](https://www.lankapay.net/en/for-financial/lanka-qr) directs merchants to their bank and identifies merchant acquirers as the institutions that onboard merchants and issue LANKAQR codes.

## Inputs needed from the merchant's bank or approved provider

- The actual bank-issued merchant QR payload, with written confirmation that this merchant account is enabled for dynamic codes.
- The acquirer's current payload rules and required network fields, including whether its merchant template can be modified locally or must be issued through the provider API.
- The supported amount, reference, expiry and duplicate-payment rules and the provider's payment-notification or reconciliation procedure.
- Sandbox/test identifiers and confirmation that generated codes are accepted by supported Sri Lankan banking applications.

Do not create merchant account data from the shop's bank account number or phone number. Do not assume that a generic EMV payload with country LK, currency 144 and a valid CRC is sufficient to be LANKAQR-compliant. A CRC detects accidental corruption and is not proof that an acquiring bank issued or approved the merchant payload.

Once the acquirer supplies and approves a modifiable template, a generator can preserve its verified merchant/network data, insert the exact server-confirmed amount and an approved unique reference, calculate the specified checksum and validate bank-app behavior. It must stay disabled before that confirmation. It must not display a guessed code or silently fall back to a different receiving account if validation fails.

No native generator, unverified merchant payload, activation flag or bank credentials were added during this research. The supported payment-link QR remains the honest fallback, and its UI continues to distinguish it from a native LANKAQR code. Native dynamic LANKAQR remains an explicit provider-dependent requirement.
