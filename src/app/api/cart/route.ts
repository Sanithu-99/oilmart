import { NextResponse } from "next/server";

import { resolveCartIdentity } from "@/features/cart/identity";
import { getCart } from "@/features/cart/service";
import { CART_COOKIE, cartCookieOptions } from "@/features/cart/token";

export async function GET(request: Request) {
  const { identity, rawToken } = await resolveCartIdentity(request);
  const cart = await getCart(identity);
  const response = NextResponse.json(cart, { headers: { "cache-control": "private, no-store, max-age=0" } });
  if (rawToken) response.cookies.set(CART_COOKIE, rawToken, cartCookieOptions);
  return response;
}
