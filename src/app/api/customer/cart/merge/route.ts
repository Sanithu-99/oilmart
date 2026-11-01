import { NextResponse } from "next/server";

import { mergeGuestCart } from "@/features/cart/service";
import { CART_COOKIE, hashCartToken } from "@/features/cart/token";
import { getCurrentCustomer } from "@/features/customer/auth/authorization";

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const raw = (request.headers.get("cookie") ?? "").match(new RegExp(`(?:^|; )${CART_COOKIE}=([^;]+)`))?.[1];
  if (!raw) return NextResponse.json({ merged: 0, conflicts: [] });
  const result = await mergeGuestCart(customer.id, hashCartToken(decodeURIComponent(raw)));
  const response = NextResponse.json(result);
  response.cookies.delete(CART_COOKIE);
  return response;
}
