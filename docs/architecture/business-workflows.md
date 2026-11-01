# Business workflows

## Checkout

Validate cart and customer input → calculate server-side price → validate stock → create order snapshot → create offline payment record → commit/reserve stock according to policy → enqueue confirmation. Online payments cannot become paid without verified provider confirmation.

## Order transitions

Transitions are explicit and server-enforced. Unpaid orders cannot jump to processing. Fulfillment branches after processing into ready-for-pickup or out-for-delivery. Refund records are separate from payment attempts.

## Pre-orders

Only products with `acceptsPreOrders` may receive requests. Submission creates `PENDING_APPROVAL`; an authorized administrator can approve/reject; approval never charges automatically; eligible approved requests may later convert once to an order. Every transition is recorded.

## Quotations

Requests can include catalog and free-text lines. Staff prepare exact prices, validity, terms, taxes, and charges. Fee collection remains disabled. Acceptance requires an unexpired approved/sent quotation and can convert once to an order.

## Loose oil

Loose oil uses a product subtype with configurable measurement label, minimum quantity, increment, and predefined quantities. Decimal arithmetic prevents floating-point drift.

## Delivery

Pickup uses configured store information. Automatic distance pricing requires a route-distance provider. Without one, delivery stays disabled or follows the manual quote workflow; straight-line distance is never presented as road distance.
