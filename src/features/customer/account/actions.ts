"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireCustomer } from "@/features/customer/auth/authorization";
import { addCartItem } from "@/features/cart/service";
import { issuePhoneOtp, verifyPhoneOtp } from "@/features/customer/verification/sms";
import { AddressType, ConsentType, Locale } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";

export type AccountState = { ok?: boolean; message?: string; code?: string; challengeId?: string };
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const passwordSchema = z.string().min(10).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/);

export async function updateProfileAction(_state: AccountState, form: FormData): Promise<AccountState> {
  const customer = await requireCustomer();
  const parsed = z.object({ firstName: z.string().min(1).max(80), lastName: z.string().min(1).max(80), locale: z.enum(Locale) }).safeParse({ firstName: text(form, "firstName"), lastName: text(form, "lastName"), locale: text(form, "locale") });
  if (!parsed.success) return { message: "Please enter a valid name and language." };
  await db.$transaction([
    db.customerProfile.update({ where: { id: customer.id }, data: parsed.data }),
    db.user.update({ where: { id: customer.userId }, data: { name: `${parsed.data.firstName} ${parsed.data.lastName}` } }),
  ]);
  revalidatePath("/en/account", "layout");
  return { ok: true, message: "Profile updated." };
}

export async function saveAddressAction(_state: AccountState, form: FormData): Promise<AccountState> {
  const customer = await requireCustomer();
  const parsed = z.object({ id: z.string().optional(), type: z.enum(AddressType), label: z.string().max(40), recipient: z.string().min(2).max(120), phone: z.string().min(7).max(30), line1: z.string().min(3).max(160), line2: z.string().max(160), city: z.string().min(2).max(80), district: z.string().max(80), province: z.string().max(80), postalCode: z.string().max(20) }).safeParse({ id: text(form, "id") || undefined, type: text(form, "type"), label: text(form, "label"), recipient: text(form, "recipient"), phone: text(form, "phone"), line1: text(form, "line1"), line2: text(form, "line2"), city: text(form, "city"), district: text(form, "district"), province: text(form, "province"), postalCode: text(form, "postalCode") });
  if (!parsed.success) return { message: "Please complete the required address fields." };
  const isDefault = form.get("isDefault") === "on";
  await db.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { customerId: customer.id, type: parsed.data.type }, data: { isDefault: false } });
    const data = { ...parsed.data, id: undefined, label: parsed.data.label || null, line2: parsed.data.line2 || null, district: parsed.data.district || null, province: parsed.data.province || null, postalCode: parsed.data.postalCode || null, isDefault };
    if (parsed.data.id) {
      const updated = await tx.address.updateMany({ where: { id: parsed.data.id, customerId: customer.id }, data });
      if (!updated.count) throw new Error("Address not found");
    } else await tx.address.create({ data: { ...data, customerId: customer.id } });
  });
  revalidatePath("/en/account/addresses", "page");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddressAction(form: FormData) {
  const customer = await requireCustomer();
  await db.address.deleteMany({ where: { id: text(form, "id"), customerId: customer.id } });
  revalidatePath("/en/account/addresses", "page");
}

export async function changePasswordAction(_state: AccountState, form: FormData): Promise<AccountState> {
  const customer = await requireCustomer();
  const current = text(form, "currentPassword");
  const next = text(form, "newPassword");
  if (!customer.user.passwordHash || !(await compare(current, customer.user.passwordHash))) return { message: "Current password is incorrect." };
  if (!passwordSchema.safeParse(next).success) return { message: "Use 10+ characters with upper/lowercase letters and a number." };
  await db.user.update({ where: { id: customer.userId }, data: { passwordHash: await hash(next, 12), sessionVersion: { increment: 1 } } });
  return { ok: true, message: "Password changed. Other sessions have been invalidated." };
}

export async function requestPhoneOtpAction(_state: AccountState, form: FormData): Promise<AccountState> {
  const customer = await requireCustomer();
  try {
    const result = await issuePhoneOtp(customer.userId, text(form, "phone"));
    return { ok: result.status !== "unavailable", message: result.status === "unavailable" ? "SMS verification is not configured yet." : "Verification code prepared.", challengeId: result.challengeId, code: result.status === "development" ? result.code : undefined };
  } catch (error) { return { message: error instanceof Error ? error.message : "Could not prepare a code." }; }
}

export async function verifyPhoneOtpAction(_state: AccountState, form: FormData): Promise<AccountState> {
  const customer = await requireCustomer();
  const valid = await verifyPhoneOtp(customer.userId, text(form, "challengeId"), text(form, "code"));
  return valid ? { ok: true, message: "Phone number verified." } : { message: "That code is invalid, expired, or has too many attempts." };
}

export async function updatePreferencesAction(_state: AccountState, form: FormData): Promise<AccountState> {
  const customer = await requireCustomer();
  await db.marketingConsent.createMany({ data: [
    { customerId: customer.id, type: ConsentType.EMAIL_MARKETING, granted: form.get("emailMarketing") === "on", source: "account-preferences" },
    { customerId: customer.id, type: ConsentType.SMS_MARKETING, granted: form.get("smsMarketing") === "on", source: "account-preferences" },
  ] });
  return { ok: true, message: "Communication preferences updated." };
}

export async function requestAccountDeletionAction() {
  const customer = await requireCustomer();
  await db.customerProfile.update({ where: { id: customer.id }, data: { deletionRequestedAt: new Date() } });
  revalidatePath("/en/account/preferences", "page");
}

export async function reorderAction(form: FormData) {
  const customer = await requireCustomer();
  const orderId = z.string().min(1).parse(form.get("orderId"));
  const locale = z.enum(["en", "si", "ta"]).parse(form.get("locale"));
  const order = await db.order.findFirst({ where: { id: orderId, customerId: customer.id }, include: { items: true } });
  if (!order) throw new Error("Order not found");
  let added = 0;
  for (const item of order.items) {
    try { await addCartItem({ customerId: customer.id }, item.variantId, item.quantity.toString()); added++; } catch { /* unavailable items are skipped and disclosed in the redirect */ }
  }
  redirect(`/${locale}/cart?reordered=${added}&unavailable=${order.items.length - added}`);
}
