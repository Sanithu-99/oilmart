# Requirements completion - 26 November 2026

This report distinguishes implemented software from real merchant/device activation and verified catalogue data. No live charge, email, SMS, stock adjustment or pricing change was performed during this work. No discount, free-litre offer or bank receiving account was invented.

| Requirement | Software and remaining activation |
|---|---|
| Dynamic QR | Complete for unique per-order payment-request/merchant-link QR. A native bank-app LANKAQR still needs an acquiring bank's registered template and network rules; see lankaqr-provider-requirements.md. |
| Phone-number transfer | Manual confirmed-order phone-transfer instructions, reporting and actual-receipt verification are complete. Owner must enter a registered receiving number and confirm the bank process. |
| Genie research | Complete: hosted links and merchant terms are researched. Genie manual links remain supported. Automatic PayHere is implemented as the documented gateway alternative; an automatic Genie API is not fabricated. |
| Official descriptions | Partial: 88 of 313 imported products now have verified original summaries (previously 13). The other 225 need exact manufacturer identification. |
| Gateway settlement research | Complete: Genie within two working days; DirectPay T+1 Visa/Mastercard/JustPay/QR and T+2 Amex/FriMi; PayHere publishes T+2. Signed merchant terms and holds govern actual availability. Primary links remain in requirements-2026-11-25.md. |
| Loyalty cash/bank price and card 4% | Lower member prices and reviewed batch setup are complete. The shop must choose actual discounts. The 4% calculation remains an estimate and is not collected by hosted checkout; provider approval remains unresolved. |
| Owner-phone OTP | Complete adapter and enforcement for loyalty application, activation and eligibility. Requires the real private Android gateway, device and SIM configuration. |
| Remove compatibility | Complete customer-facing removal: discovery filters, specifications, imported vehicle suffixes in product/cart/history titles and generic fitment sentences. Raw inventory provenance remains available privately. |
| Similar products | Complete with picture, name and price; unpublished products remain excluded. |
| Loose oil | Complete editable measured-quantity template. Existing 16 loose-oil records remain unchanged. |
| Approval-required preorders | Complete request, review, approval, current-price continuation and stock-confirmation gate. Owner can enable selected products in the reviewed batch screen. |
| Individual quotation fee | Complete owner-set fee/terms, exact-revision acceptance, separate service invoice and payment verification. No blanket fee is assumed. |
| Source-file categories | Complete source-section filtering over the imported catalogue, with brand/category fallback. Numeric warehouse groups remain private. |
| Pack-size dropdown | Complete explicit variant and independent size-SKU selection, retaining exact grade/model identity. |
| Free-litre headings | Complete editable verified pack-offer field; owner must enter actual SKU offers. None are invented from a pack's total volume. |
| Remove sort menu | Complete. |
| Price-change notices | Complete catalogue, details, cart and order-review surfaces. |
| Clear product pictures | Partial: ten exact manufacturer assets added, nine high resolution and one original 300x493 photo flagged for quality review. Nine missing-image slots filled; 121 imported products still lack a storefront photo. |
| Stock before payment | Complete: unpaid draft, physical stock confirmation and reservation precede payment instructions; only actual manual receipt or verified provider callback commits stock. |

## Operational setup

Open `/admin/launch` for actual configuration/data counts. The reviewed catalogue batch previews product-level loyalty prices and derives each variant from its own retail override. It requires catalogue permission, explicit acknowledgement, a reason and unchanged product revisions, and records history/audit atomically. It also enables/disables future preorder requests without approving any existing request. Every receiving-account change remains owner-only under `/admin/payments`.

Automatic PayHere uses server-only merchant configuration and signed form notifications at `/api/payments/payhere/notify`; real billing details are requested rather than invented. Resend supports registration, verification resend and both customer/admin password recovery. The SMSGate adapter keeps OTP plaintext out of persistence. Setup guides: payment-gateway-integration.md and operations/customer-verification.md.

Actual merchant, bank, phone and sender credentials remain absent. Publicly reachable sandbox notification testing and an isolated PostgreSQL integration/concurrency test are required before live activation. English/Sinhala/Tamil storefront copy remains subject to native-language review; the new PayHere billing form uses English.

The reproducible owner content worksheet is `docs/assets/catalogue-content-review-2026-11-26.csv`; it lists exact SKU, source, original description, image fallback and review flags. Manufacturer-origin photos still require owner review of reuse rights and the actual supplied batch.
