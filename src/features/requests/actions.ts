"use server";

import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCustomer } from "@/features/customer/auth/authorization";
import { requireAdmin } from "@/features/admin/auth/authorization";
import { writeAudit } from "@/features/admin/audit";
import { db } from "@/lib/db/client";
import { assertPersistentRateLimit } from "@/lib/security/admin-rate-limit";
import { commerceCopy } from "@/lib/i18n/commerce";
import { requestSchema, quotationFeeMinor, assertPreorderDecision, assertQuotationEditable, RequestValidationError } from "./validation";

export type RequestState = { reference?: string; error?: string; invalidFields?: string[] };

export async function submitRequestAction(_state: RequestState, form: FormData): Promise<RequestState> {
  const locale = String(form.get("locale") ?? "en");
  const parsed = requestSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: commerceCopy(locale).failed, invalidFields: parsed.error.issues.map((issue) => String(issue.path[0])) };
  const input = parsed.data;
  try {
    const customer = await requireCustomer();
    if (!customer.user.emailVerified) return { error: locale === "en" ? "Verify your email before sending a request." : commerceCopy(locale).failed };
    await assertPersistentRateLimit("customer-request", customer.id, 10, 60 * 60_000);
    const reference = `${input.kind === "quote" ? "QUO" : "PRE"}-${input.requestKey}`;
    const notes = [input.vehicle && `Vehicle / customer reference: ${input.vehicle}`, input.notes].filter(Boolean).join("\n");
    await db.$transaction(async (tx) => {
      const existing = input.kind === "quote" ? await tx.quotation.findUnique({ where: { reference } }) : await tx.preOrder.findUnique({ where: { reference } });
      if (existing) {
        if (existing.customerId !== customer.id) throw new Error("Invalid reference");
        return;
      }
      const product = input.productSlug ? await tx.product.findFirst({ where: { slug: input.productSlug, status: "ACTIVE" }, include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } } }) : null;
      if (input.productSlug && !product) throw new Error("Product unavailable");
      const variant = input.variantId ? product?.variants.find((item) => item.id === input.variantId) : product?.variants[0];
      if (product && !variant) throw new Error("Select a valid size");
      const contact = { customerId: customer.id, customerName: input.name, customerPhone: input.phone, customerEmail: customer.user.email, notes };
      if (input.kind === "preorder") {
        if (!product?.acceptsPreOrders || !variant) throw new Error("Pre-orders are unavailable");
        const quantity = new Decimal(input.quantity);
        if (quantity.lt(variant.minQuantity.toString()) || !quantity.minus(variant.minQuantity.toString()).mod(variant.quantityStep.toString()).isZero()) throw new Error("Invalid quantity");
        await tx.preOrder.create({ data: { ...contact, reference, productId: product.id, variantId: variant.id, quantity: input.quantity, status: "PENDING_APPROVAL", history: { create: { toStatus: "PENDING_APPROVAL", actorId: customer.userId, notes: "Customer requested approval; no stock reserved or payment collected." } } } });
      } else {
        await tx.quotation.create({ data: { ...contact, reference, status: "REQUESTED", feeCollectionEnabled: false, feePaid: false, items: { create: { productId: product?.id, variantId: variant?.id, requestedName: product?.name ?? (input.vehicle || "Customer quotation request"), requestedQuantity: input.quantity } }, history: { create: { toStatus: "REQUESTED", actorId: customer.userId, notes: "Owner must set and confirm the fee before payment." } } } });
      }
    }, { isolationLevel: "Serializable" });
    revalidatePath(`/${locale}/requests`);
    revalidatePath("/admin/requests");
    return { reference };
  } catch { return { error: commerceCopy(locale).failed }; }
}

export async function reviewRequestAction(_state: RequestState, form: FormData): Promise<RequestState> {
  const input = z.object({ id: z.string().min(1), kind: z.enum(["quote", "preorder"]), updatedAt: z.coerce.date(), decision: z.enum(["APPROVED", "REJECTED", "PREPARED"]), notes: z.string().trim().min(3).max(2000), fee: z.string().default("") }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "Enter a review note and a valid fee for quotations." };
  try {
    const data = input.data;
    const actor = await requireAdmin(data.kind === "quote" ? "quotations.manage" : "preorders.manage");
    await db.$transaction(async (tx) => {
      if (data.kind === "quote") {
        const before = await tx.quotation.findUniqueOrThrow({ where: { id: data.id } });
        assertQuotationEditable(before.status);
        if (data.decision !== "PREPARED" && data.decision !== "REJECTED") throw new RequestValidationError("Invalid quotation decision");
        const feeMinor = data.decision === "PREPARED" ? quotationFeeMinor(data.fee) : before.feeMinor;
        const result = await tx.quotation.updateMany({ where: { id: data.id, updatedAt: data.updatedAt }, data: { status: data.decision, feeMinor, terms: data.notes, reviewedById: actor.id, reviewedAt: new Date(), feeCollectionEnabled: false, feePaid: false } });
        if (result.count !== 1) throw new RequestValidationError("This request changed. Reload and try again.");
        await tx.quotationHistory.create({ data: { quotationId: data.id, fromStatus: before.status, toStatus: data.decision, actorId: actor.id, notes: `${data.notes}\nFee (minor units): ${feeMinor}` } });
        await writeAudit(tx, actor, { action: "QUOTATION_REVIEWED", entityType: "Quotation", entityId: data.id, before, after: { status: data.decision, feeMinor: feeMinor.toString(), terms: data.notes } });
      } else {
        const before = await tx.preOrder.findUniqueOrThrow({ where: { id: data.id } });
        assertPreorderDecision(before.status);
        if (data.decision === "PREPARED") throw new RequestValidationError("Invalid pre-order decision");
        const result = await tx.preOrder.updateMany({ where: { id: data.id, updatedAt: data.updatedAt }, data: { status: data.decision, decisionNotes: data.notes, reviewedById: actor.id, reviewedAt: new Date() } });
        if (result.count !== 1) throw new RequestValidationError("This request changed. Reload and try again.");
        await tx.preOrderHistory.create({ data: { preOrderId: data.id, fromStatus: before.status, toStatus: data.decision, actorId: actor.id, notes: data.notes } });
        await writeAudit(tx, actor, { action: "PREORDER_REVIEWED", entityType: "PreOrder", entityId: data.id, before, after: { status: data.decision, decisionNotes: data.notes } });
      }
    }, { isolationLevel: "Serializable" });
    revalidatePath("/admin/requests");
    for (const locale of ["en", "si", "ta"]) revalidatePath(`/${locale}/requests`);
    return { reference: "Review saved. No payment collected or order created." };
  } catch (error) { return { error: error instanceof RequestValidationError ? error.message : "Could not save review. Check your access, reload and retry." }; }
}
