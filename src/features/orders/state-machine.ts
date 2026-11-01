export const orderStatuses = [
  "DRAFT",
  "PENDING_PAYMENT",
  "AWAITING_MANUAL_VERIFICATION",
  "PAID",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

const allowedTransitions: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  DRAFT: ["PENDING_PAYMENT", "AWAITING_MANUAL_VERIFICATION", "CANCELLED"],
  PENDING_PAYMENT: ["AWAITING_MANUAL_VERIFICATION", "PAID", "CANCELLED"],
  AWAITING_MANUAL_VERIFICATION: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "CANCELLED", "REFUNDED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED", "REFUNDED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`Order status transition ${from} -> ${to} is not allowed`);
  }
}
