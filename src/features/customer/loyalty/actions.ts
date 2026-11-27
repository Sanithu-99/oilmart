"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/features/admin/auth/authorization";
import { writeAudit } from "@/features/admin/audit";
import { requireCustomer } from "@/features/customer/auth/authorization";
import { LoyaltyStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { loyaltyContactsVerified } from "./eligibility";

export async function applyForLoyaltyAction() {
  const customer = await requireCustomer();
  if (!customer.user.emailVerified) throw new Error("Verify your email before applying");
  if (!loyaltyContactsVerified(customer.user)) throw new Error("Verify your mobile number in Security & verification before applying for loyalty.");
  await db.$transaction(async (tx) => {
    const existing = await tx.loyaltyMembership.findUnique({ where: { customerId: customer.id } });
    if (existing && existing.status !== LoyaltyStatus.REJECTED && existing.status !== LoyaltyStatus.EXPIRED) return;
    const membership = existing
      ? await tx.loyaltyMembership.update({ where: { id: existing.id }, data: { status: LoyaltyStatus.PENDING, notes: null, suspendedAt: null } })
      : await tx.loyaltyMembership.create({ data: { customerId: customer.id, status: LoyaltyStatus.PENDING, verifiedAt: new Date() } });
    await tx.loyaltyDecisionHistory.create({ data: { membershipId: membership.id, fromStatus: existing?.status, toStatus: LoyaltyStatus.PENDING, notes: "Customer application" } });
    await writeAudit(tx, { id: customer.userId }, { action: "LOYALTY_APPLIED", entityType: "LoyaltyMembership", entityId: membership.id });
  });
  revalidatePath("/en/account/loyalty", "page");
}

export async function applyForLoyaltyFormAction() {
  try {
    await applyForLoyaltyAction();
    return { ok: true, message: "Your loyalty application was submitted for shop approval." };
  } catch {
    return { ok: false, message: "Verify your email and mobile number, then try again. If you already did, refresh or contact the store." };
  }
}

const allowed: Record<LoyaltyStatus, LoyaltyStatus[]> = {
  PENDING: [LoyaltyStatus.ACTIVE, LoyaltyStatus.REJECTED],
  ACTIVE: [LoyaltyStatus.SUSPENDED, LoyaltyStatus.EXPIRED],
  SUSPENDED: [LoyaltyStatus.ACTIVE, LoyaltyStatus.EXPIRED],
  REJECTED: [LoyaltyStatus.PENDING],
  EXPIRED: [LoyaltyStatus.ACTIVE, LoyaltyStatus.PENDING],
};

async function memberNumber() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `SOM-${new Date().getFullYear()}-${randomInt(100000, 999999)}`;
    if (!(await db.loyaltyMembership.findUnique({ where: { memberNumber: candidate } }))) return candidate;
  }
  throw new Error("Could not allocate a member number");
}

export async function decideLoyaltyAction(form: FormData) {
  const actor = await requireAdmin("loyalty.manage");
  const id = z.string().min(1).parse(form.get("id"));
  const toStatus = z.enum(LoyaltyStatus).parse(form.get("status"));
  const notes = String(form.get("notes") ?? "").trim().slice(0, 1000) || null;
  const current = await db.loyaltyMembership.findUniqueOrThrow({ where: { id } });
  if (!allowed[current.status].includes(toStatus)) throw new Error(`Cannot change ${current.status} to ${toStatus}`);
  const number = toStatus === LoyaltyStatus.ACTIVE ? current.memberNumber ?? await memberNumber() : current.memberNumber;
  await db.$transaction(async (tx) => {
    if (toStatus === LoyaltyStatus.ACTIVE) {
      const applicant = await tx.customerProfile.findUnique({ where: { id: current.customerId }, include: { user: true } });
      if (!applicant || !loyaltyContactsVerified(applicant.user)) throw new Error("The customer must verify their email and mobile number before loyalty can be activated.");
    }
    const after = await tx.loyaltyMembership.update({ where: { id }, data: {
      status: toStatus,
      memberNumber: number,
      notes,
      approvedAt: toStatus === LoyaltyStatus.ACTIVE ? new Date() : current.approvedAt,
      approvedById: toStatus === LoyaltyStatus.ACTIVE ? actor.id : current.approvedById,
      suspendedAt: toStatus === LoyaltyStatus.SUSPENDED ? new Date() : null,
    } });
    await tx.loyaltyDecisionHistory.create({ data: { membershipId: id, actorId: actor.id, fromStatus: current.status, toStatus, notes } });
    await writeAudit(tx, actor, { action: `LOYALTY_${toStatus}`, entityType: "LoyaltyMembership", entityId: id, before: current, after });
  });
  revalidatePath("/admin/loyalty");
  revalidatePath("/en", "layout");
}
