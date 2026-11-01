import "server-only";

import { getCurrentCustomer } from "@/features/customer/auth/authorization";
import { CART_COOKIE, createCartToken, hashCartToken } from "./token";

export async function resolveCartIdentity(request: Request, createGuest = true) {
  const customer = await getCurrentCustomer();
  if (customer) return { identity: { customerId: customer.id } as const, rawToken: null };
  const cookieHeader = request.headers.get("cookie") ?? "";
  const raw = cookieHeader.match(new RegExp(`(?:^|; )${CART_COOKIE}=([^;]+)`))?.[1];
  if (!raw && !createGuest) return { identity: null, rawToken: null };
  const token = raw ? decodeURIComponent(raw) : createCartToken();
  return { identity: { guestTokenHash: hashCartToken(token) } as const, rawToken: raw ? null : token };
}
