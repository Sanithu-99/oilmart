import { NextResponse } from "next/server";
import { z } from "zod";

import { removeCartItem, updateCartItem } from "@/features/cart/service";
import { resolveCartIdentity } from "@/features/cart/identity";
import { assertCartMutationRate } from "@/lib/security/rate-limit";

const schema = z.object({ quantity: z.string().regex(/^\d+(\.\d{1,3})?$/) });

async function getIdentity(request: Request) {
  const { identity } = await resolveCartIdentity(request, false);
  if (!identity) throw new Error("Cart not found");
  assertCartMutationRate(identity.customerId ?? identity.guestTokenHash);
  return identity;
}

export async function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const [{ itemId }, input] = await Promise.all([context.params, request.json().then((body) => schema.parse(body))]);
    return NextResponse.json(await updateCartItem(await getIdentity(request), itemId, input.quantity));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await context.params;
    return NextResponse.json(await removeCartItem(await getIdentity(request), itemId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
