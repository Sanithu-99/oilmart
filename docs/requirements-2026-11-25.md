# Website requirements and payment research

Reviewed 25 November 2026. The owner clarified that quotation fees are individually set for each vehicle or customer. No flat quotation fee is assumed.

## Implemented locally

The continuation now includes stock-confirmed order submission, customer acceptance of individual quotation fees, approved pre-order conversion, manual payment verification, per-order QR codes, owner receiving-account settings and a private phone-backed SMS adapter. See `docs/operations/payments-and-sms.md` for the exact operational flow and required external setup.

| Requirement | Result |
|---|---|
| Product categories from supplied files | Source sections from the imported Inventory Details Report and Caltex price revision now filter the catalogue. Numeric warehouse groups stay internal. Brand/category fallback applies when no descriptive source section is linked. |
| Remove compatibility and sorting | Automated vehicle/application matching and the sort control are removed from storefront discovery. Fitment fields are excluded from product specifications and catalogue editing. Historical source provenance stays in the admin document register. |
| Size dropdowns | Active variants have a selector with matching price, stock and cart ID. Independent product SKUs differing only in pack size link through a size dropdown; grades and model numbers stay distinct. |
| Free-litre offers | Owner can enter a verified “Pack offer” such as “5 L + 1 L free (6 L total)” in the product editor. It appears in the heading and cards. No unverified offer is invented from total volume. |
| Notices below prices | Shared English/Sinhala/Tamil price-change notices appear on catalogue, detail, cart and cart-drawer surfaces. Stock-before-payment information appears before any order inquiry. |
| Similar options | Existing same-category/manually selected recommendations remain, with picture/name/price. Unpublished manual recommendations are excluded. |
| Loose oil | Admin “Loose oils” opens a reusable draft-entry template with litre units and measured-quantity defaults. Name, prices, grade, quantity increments and stock remain editable through existing catalogue/inventory controls. |
| Loyalty | Product/variant editors support the lower loyalty price. Server-side cart estimates add 4% only to eligible loyalty-priced item totals for a card estimate; cash/bank have no adjustment. Delivery and ordinary retail lines are excluded. Promotion reduces the loyalty base before the adjustment. Live card collection remains disabled. |
| Pre-orders | Verified customers request approval. Approved requests can continue to an idempotent draft pickup order at the current price. Physical stock confirmation still gates payment. |
| Individual quotation fee | Owner sets a fee and terms per request. Customer accepts the exact revision to create a service-fee invoice with no merchandise lines. Verified receipt updates the fee payment state. |
| Manufacturer descriptions | Original, source-linked summaries cover five exact Caltex families. Other items retain conservative inventory content and need verified manufacturer matching. Admin can record the official source and write original text. |

## Payment feasibility and settlement

| Option | Evidence and decision |
|---|---|
| Dynamic QR | Per-order QR generation is implemented. It opens the confirmed payment request or a current merchant-generated hosted payment URL. This is a payment-link QR; dynamic LANKAQR payloads still require an acquiring/provider integration. |
| Genie / Dialog Pay Business | Current merchant site advertises IPG, links and QR. Developer access provides merchant API keys and sandbox arrangements. Public merchant terms §5.2.1 say daily transactions settle within two working days. Verify the final merchant agreement, cutoffs, fees and holds. |
| NTB / FriMi phone-number transfer | FriMi's official material confirms transfer to another FriMi user's mobile number. This does not establish that every NTB account supports the same feature or that a public checkout API exists. Owner must provide a registered receiving account/number and bank-confirmed merchant process. Treat as manual verification until an authenticated bank/provider integration exists. The shop contact number is not assumed to be a payment recipient. |
| DirectPay | Official FAQ states T+1 business day for Visa/Mastercard, JustPay and QR; T+2 for Amex/FriMi. Merchant onboarding and applicable plan still required. |
| PayHere | Official knowledge base states daily T+2 payouts after notification. Its general legal page separately describes settlement within three days; verify the signed payout terms and business-day/cutoff handling with the provider. |

Payment acknowledgement and bank settlement are different events. Weekends, holidays, disputes and contractual holds can affect availability. Product payment should be initiated only after a stock check, approved final amount and expiry/reservation policy. The site supports confirmed manual payments and owner-supplied merchant-hosted payment links. Automatic gateway initiation/callback reconciliation still requires a separately configured and tested provider integration.

### Card adjustment conflict

Genie merchant terms §4.4 prohibit charging the customer to recover card processing fees; §4.5.2 requires terms no less favorable than cash. The requested 4% pricing policy must not be connected to Genie unless the provider confirms an acceptable arrangement in writing. Relabeling a surcharge does not resolve that conflict. Current implementation is an estimate without a payment route, not approval of a live charging policy.

### SMS from the owner's number

A personal unlimited package does not by itself provide an application API or establish permission for automated OTP traffic. Identify the exact operator/plan, confirm permitted use and limits, and provision a secure phone/SIM gateway if allowed. The phone must be online, able to send reliably and expose authenticated delivery results; it must never expose an unauthenticated SMS endpoint. Dialog's eSMS service is an alternative application-to-person platform with delivery reports. Current OTP hashing, expiry, resend and attempt limits remain; the private SMSGate adapter requires a connected phone and scoped gateway token for live delivery. Do not represent a queued notification as delivered.

## Content and photographs still needed

The local imported inventory contains 313 records, with 130 missing product images. Existing 900px canvases do not prove that source photos have 900px of real detail. Use the admin “Needs photo” filter to review missing images and the existing photo uploader for supplier-approved front/back/seal photos. Do not replace missing exact products with misleading generic packshots.

Manufacturer facts should be checked for the exact Sri Lankan grade/formulation and written in original language. Replacing a few words in copyrighted marketing text does not guarantee freedom from claims. Images/logos require a separate rights check. Do not copy another retailer's description or photograph as an official manufacturer source. Descriptive summaries do not make vehicle compatibility claims.

## Primary sources

- [Dialog Pay Business developer access](https://www.geniebusiness.lk/developer)
- [Dialog Pay Business QR](https://www.geniebusiness.lk/qr-payments)
- [Genie merchant terms, §§4.4, 4.5.2, 5.2.1](https://www.geniebusiness.lk/downloads/Terms-and-Conditions-Genie-Business.pdf)
- [DirectPay settlement FAQ](https://www.directpay.lk/faq)
- [PayHere general questions](https://support.payhere.lk/general-questions)
- [PayHere legal terms](https://www.payhere.lk/legal/)
- [FriMi Send Money](https://www.frimi.lk/blog-post/sending-money)
- [Dialog eSMS](https://esms.dialog.lk/)
- [Caltex Super 4T 20W-50](https://caltex.lk/product/havoline-super-4t-sae-20w-50/)
- [Caltex Super 4T 20W-40](https://caltex.lk/product/havoline-super-4t-sae-20w-40/)
- [Caltex Formula 10W-30](https://caltex.lk/product/havoline-formula-sae-10w-30/)
- [Caltex Delo Gold Ultra](https://caltex.lk/product/caltex-delo-gold-ultra/)
- [Caltex Super 2T](https://caltex.lk/product/havoline-super-2t/)
