# Commerce interaction contract

## Business evidence

The current user requirements and clarification on 25 November 2026 establish source-document categories, removal of automated fitment claims and sorting, individual owner-set quotation fees, pre-order approval, loyalty price estimates, and payment only after stock confirmation. `docs/requirements-2026-11-25.md` records implementation status and external dependencies. `docs/architecture/overview.md`, `src/features/admin/auth/authorization.ts`, and `src/features/customer/auth/authorization.ts` own architecture and permissions. Existing PostgreSQL relations and statuses are defined in `prisma/schema.prisma`.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select elements in ProductOptions, RequestForm and ProductEditor | DESIGN.md and existing dashboard controls | Native OS-owned popups; no authored geometry promise | Requirements browser suite and keyboard inspection |
| Date | Existing dashboard native date/time fields | Existing promotion editor and browser-local input behavior | Native OS-owned popup accepted | Existing editor checks; no date logic changes in this task |
| Form | Server-action schema validation with useActionState for requests | features/requests/validation.ts and actions.ts | Customer create and administrator review | Unit tests and action authorization tests |
| Scrollbar | Global application stylesheet | src/app/globals.css | Standard thin scrollbar, engine fallback, forced colors | Static audit and browser computed style |
| Toast | Inline status/alert feedback in request forms | RequestState and server acknowledgement | Success status and recoverable inline error | Unit/component verification |
| CRUD | Domain server actions and authenticated routes | features/requests/actions.ts and existing catalogue actions | Stay on review; product save keeps existing redirect to edit | Unit and browser route protection |
| Table Selection | CommerceBatchForm native checkboxes | features/admin/commerce-setup-rules.ts | Current page only, at most 50 products per action, preview and explicit acknowledgement | Batch action tests and browser interaction fixture |

## Flow ledger

- Catalogue filtering is local over the complete active catalogue. URL parameters retain section, brand, query, grade, stock and category. Legacy vehicle/application/sort parameters do not change results. Load-more remains explicit. Clearing search returns focus to its input.
- Document source headings label catalogue sections. Numeric warehouse headings stay internal. These are product categories, never assertions of vehicle fitment. Independent size SKUs stay separate stock records and navigate to their own product URLs; explicit variants select the matching ID/price/stock locally. No fabricated size or bonus offer is inferred.
- Price calculations remain server-owned. The cart receives server-computed cash/bank and card estimates; the browser only chooses which estimate to show. Active, unexpired and verified loyalty eligibility is checked server-side. The requested card adjustment is a non-collecting estimate pending provider contract approval. Hosted checkout does not apply it. Cash, configured bank/phone transfers and merchant-hosted payment links use the trusted server amount without that adjustment.
- Customer requests require an authenticated, email-verified account, validated contact data and acknowledgement. Errors retain fields and focus the invalid field/alert. A stable request UUID makes retries idempotent; duplicate references cannot expose another customer's request. Request history is customer-scoped and capped at ten recent records of each kind.
- Pre-orders start pending approval and do not reserve stock, create an order or collect payment. The product must explicitly accept pre-orders. Review permission is `preorders.manage`; only pending records can be approved/rejected. After approval, customers review the current price and create a draft pickup order. Payment instructions remain blocked until physical stock is confirmed and reserved.
- Quotation fee is entered for each request, including a deliberate zero if appropriate; there is no global fee. `quotations.manage` gates preparation/rejection. The customer accepts the exact fee and version to create a quotation-service invoice. It has no merchandise lines. Confirmation releases payment instructions; actual receipt must be verified before feePaid changes.
- Request reviews validate the submitted record version inside a serializable transaction and append history/audit events. A stale review fails and asks for reload. Admin lists paginate at fifteen per request type. Review success is acknowledged in place.
- Existing catalogue editor save returns to the product edit page so the owner can add photos and stock. The loose-oil entry route preselects loose type, litre units, category, minimum and step; publication starts as draft. Actual inventory changes continue through the authorized stock adjustment ledger.

## Verification limits

Read-only browser checks must not submit test orders, change production inventory or create users against the configured production database. Authenticated create/review persistence is tested using mocked database transactions. Provider settlement, SMS delivery, refunds, real payment callbacks and native-language review require separate launch evidence.

## Completed order/payment contract

- The cart review submits a customer-scoped draft. Trusted server prices, variant rules, exact quantities and a cart fingerprint are checked; a changed amount, selection or quotation revision requires renewed consent. A cart/source request can create one order only.
- Owner receiving details are configured under settings.manage. Unsupported/unconfigured methods remain disabled. Shop confirmation reserves stock with version checks and snapshots the receiving details before exposing instructions.
- A unique QR opens the payment request or a current merchant-issued HTTPS link. Expired/mismatched links are hidden; a QR scan or customer receipt reference cannot mark paid. Customer references remain unverified until actual funds are checked by orders.manage.
- Verification checks the exact amount, prevents reused provider references and commits stock once through an idempotent sale ledger. Unpaid cancellation releases reservations. A reported payment must be resolved before cancellation; paid-order refunds are outside this workflow.
- Client forms prevent automatic native resets so values survive failed actions. Success is acknowledged with a link or in-place status; critical confirmation uses explicit labelled acknowledgements.
- Phone OTPs use a configured private SMSGate connection. An acknowledged request is queued, not delivered. Plaintext OTPs are not persisted; expiry, resend/attempt limits and single consumption apply. Browser tests never send SMS or mutate production data.
- Commerce setup shows configuration status rather than claiming successful live delivery. The shop chooses its own loyalty discount and preorder-enabled products. Batch edits preview exact prices, check every product revision, preserve individual size pricing, update price history and audit, and commit atomically. Selection is limited to the current page and resets when navigating; no supplier offer or discount is invented.
- Automatic PayHere preparation requires an owned, confirmed unpaid order, exact amount/currency and the configured merchant hostname. Billing details are explicitly shared only when the customer continues. The browser return never marks paid. Only the matching signed provider notification can commit the existing stock reservation once; retries, closed orders and refund/failure notices cannot duplicate inventory movements.
- Loyalty application, activation and pricing require verified email and phone. Resend dispatch acknowledges provider acceptance rather than inbox delivery; missing credentials never claim a message was sent. One-time token digests and conditional consumption prevent replay.
