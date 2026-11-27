"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/auth/authorization";
import { writeAudit } from "@/features/admin/audit";
import { commerceBatchSchema, discountedLoyaltyPrice } from "./commerce-setup-rules";
import { db } from "@/lib/db/client";

export type CommerceBatchState = { error?: string; success?: string };

export async function setupCommerceBatchAction(_previous: CommerceBatchState, form: FormData): Promise<CommerceBatchState> {
  let actor;
  try { actor = await requireAdmin("catalog.write"); } catch { return {error:"Sign in with catalogue editing permission."}; }
  let selections: unknown;
  try { selections = JSON.parse(String(form.get("products") ?? "[]")); } catch { return {error:"Reload and select products again."}; }
  const parsed = commerceBatchSchema.safeParse({products:selections, operation:form.get("operation"), discount:form.get("discount") ?? "", reason:form.get("reason"), acknowledged:form.get("acknowledged")});
  if (!parsed.success) return {error:parsed.error.issues[0]?.message ?? "Review the selected products and changes."};
  const input = parsed.data;
  try {
    await db.$transaction(async tx => {
      const products = await tx.product.findMany({where:{id:{in:input.products.map(p=>p.id)}}, include:{variants:true}});
      if (products.length !== input.products.length) throw new Error("A selected product is unavailable. Reload before trying again.");
      for (const product of products) {
        const expected = input.products.find(p=>p.id===product.id)!;
        if (product.updatedAt.toISOString() !== expected.updatedAt) throw new Error("A selected product changed. Reload to review the latest prices.");
        if (product.status === "ARCHIVED") throw new Error("Archived products cannot be changed in this screen.");
        const loyaltyPriceMinor = input.operation === "LOYALTY" ? discountedLoyaltyPrice(product.standardPriceMinor, input.discount) : product.loyaltyPriceMinor;
        const changed = await tx.product.updateMany({where:{id:product.id,updatedAt:new Date(expected.updatedAt)},data:input.operation === "LOYALTY" ? {loyaltyPriceMinor} : {acceptsPreOrders:input.operation === "ENABLE_PREORDERS"}});
        if (changed.count !== 1) throw new Error("A selected product changed. Reload before trying again.");
        if (input.operation === "LOYALTY") {
          for (const variant of product.variants) {
            const next = variant.priceOverrideMinor != null ? discountedLoyaltyPrice(variant.priceOverrideMinor,input.discount) : null;
            await tx.productVariant.update({where:{id:variant.id},data:{loyaltyPriceMinor:next}});
          }
          await tx.priceHistory.create({data:{productId:product.id,actorId:actor.id,standardPriceMinor:product.standardPriceMinor,loyaltyPriceMinor,reason:input.reason}});
        }
        await writeAudit(tx,actor,{action:"PRODUCT_COMMERCE_SETUP",entityType:"Product",entityId:product.id,before:{loyaltyPriceMinor:product.loyaltyPriceMinor,acceptsPreOrders:product.acceptsPreOrders,variantLoyaltyPrices:product.variants.map(v=>({id:v.id,price:v.loyaltyPriceMinor}))},after:input.operation === "LOYALTY" ? {loyaltyPriceMinor,discountPercent:input.discount} : {acceptsPreOrders:input.operation === "ENABLE_PREORDERS"},metadata:{reason:input.reason}});
      }
    },{isolationLevel:"Serializable",timeout:20000,maxWait:10000});
    revalidatePath("/admin","layout");
    for(const locale of ["en","si","ta"]) revalidatePath(`/${locale}`,"layout");
    return {success:`Updated ${input.products.length} selected products. Reload before making another batch change.`};
  } catch(error) {
    const known = error instanceof Error && /selected product|Archived products|discount|retail price|lower price/.test(error.message);
    return {error:known ? (error as Error).message : "The batch could not be saved. Nothing was partially applied. Reload and try again."};
  }
}
