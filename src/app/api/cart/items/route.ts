import { NextResponse } from "next/server";
import { z } from "zod";

import { addCartItem } from "@/features/cart/service";
import { resolveCartIdentity } from "@/features/cart/identity";
import { CART_COOKIE, cartCookieOptions } from "@/features/cart/token";
import { assertCartMutationRate } from "@/lib/security/rate-limit";

const schema = z.object({ variantId: z.string().min(1), quantity: z.string().regex(/^\d+(\.\d{1,3})?$/) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { identity, rawToken } = await resolveCartIdentity(request);
    if (!identity) throw new Error("Cart unavailable");
    assertCartMutationRate(identity.customerId ?? identity.guestTokenHash);
    const cart = await addCartItem(identity, input.variantId, input.quantity);
    const response = NextResponse.json(cart, { status: 201 });
    if (rawToken) response.cookies.set(CART_COOKIE, rawToken, cartCookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
