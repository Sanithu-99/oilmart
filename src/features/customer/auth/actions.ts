"use server";

import { hash } from "bcryptjs";
import { headers } from "next/headers";
import { z } from "zod";

import { writeAudit } from "@/features/admin/audit";
import { dispatchCustomerEmail } from "@/features/customer/verification/email";
import { ConsentType, Locale } from "@/generated/prisma/client";
import { resolveAppUrl } from "@/lib/config/app-url";
import { db } from "@/lib/db/client";
import { localeToDb, type StoreLocale } from "@/lib/i18n/config";
import { assertPersistentRateLimit } from "@/lib/security/admin-rate-limit";
import { consumeVerificationToken, issueVerificationToken, verificationPurposes } from "./tokens";

export type AuthFormState = { ok?: boolean; message?: string; errors?: Record<string, string[]>; previewUrl?: string };
const password = z.string().min(10, "Use at least 10 characters").max(128).regex(/[a-z]/, "Add a lowercase letter").regex(/[A-Z]/, "Add an uppercase letter").regex(/\d/, "Add a number");
const registrationSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.email(),
  password,
  confirmPassword: z.string(),
  terms: z.literal("on", { message: "Accept the terms to continue" }),
  locale: z.enum(["en", "si", "ta"]),
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

function fields(form: FormData) {
  return Object.fromEntries(form.entries());
}

function baseUrl() {
  return resolveAppUrl();
}

export async function registerCustomerAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = registrationSchema.safeParse(fields(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Please review the highlighted fields." };
  const email = parsed.data.email.trim().toLowerCase();
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await assertPersistentRateLimit("customer-register", `${ip}|${email}`, 5, 60 * 60_000);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { message: "An account already uses that email. Sign in or reset your password." };
  const now = new Date();
  const passwordHash = await hash(parsed.data.password, 12);
  const customer = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: `${parsed.data.firstName} ${parsed.data.lastName}`, email, passwordHash },
    });
    const profile = await tx.customerProfile.create({
      data: { userId: user.id, firstName: parsed.data.firstName, lastName: parsed.data.lastName, locale: localeToDb[parsed.data.locale] as Locale, termsAcceptedAt: now, privacyAcceptedAt: now },
    });
    for (const type of [ConsentType.EMAIL_MARKETING, ConsentType.SMS_MARKETING]) {
      const granted = form.get(type === ConsentType.EMAIL_MARKETING ? "emailMarketing" : "smsMarketing") === "on";
      await tx.marketingConsent.create({ data: { customerId: profile.id, type, granted, source: "registration" } });
    }
    await writeAudit(tx, { id: user.id, ip, userAgent: requestHeaders.get("user-agent") }, { action: "CUSTOMER_REGISTERED", entityType: "CustomerProfile", entityId: profile.id });
    return { ...profile, email };
  });
  const token = await issueVerificationToken(email, verificationPurposes.email, 24 * 60 * 60_000);
  const actionUrl = `${baseUrl()}/${parsed.data.locale}/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  const delivery = await dispatchCustomerEmail({ customerId: customer.id, recipient: email, templateKey: "customer-email-verification", subject: "Verify your Saranankara Oil Mart account", actionUrl });
  return {
    ok: true,
    message: delivery.status === "unavailable" ? "Account created. Email delivery is not configured yet; contact the store to verify your account." : "Account created. Check your email to verify it before signing in.",
    previewUrl: delivery.status === "development" ? delivery.previewUrl : undefined,
  };
}

export async function verifyEmailAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = z.object({ email: z.email(), token: z.string().min(20) }).safeParse(fields(form));
  if (!parsed.success) return { message: "This verification link is invalid." };
  const valid = await consumeVerificationToken(parsed.data.email, parsed.data.token, verificationPurposes.email);
  if (!valid) return { message: "This verification link has expired or was already used." };
  await db.user.update({ where: { email: parsed.data.email.toLowerCase() }, data: { emailVerified: new Date() } });
  return { ok: true, message: "Your email is verified. You can now sign in." };
}

export async function resendVerificationAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = z.object({ email: z.email(), locale: z.enum(["en", "si", "ta"]) }).safeParse(fields(form));
  if (!parsed.success) return { message: "Enter a valid email address." };
  const email = parsed.data.email.toLowerCase();
  await assertPersistentRateLimit("verification-resend", email, 3, 60 * 60_000);
  const user = await db.user.findUnique({ where: { email }, include: { customer: true } });
  let previewUrl: string | undefined;
  if (user?.customer && !user.emailVerified) {
    const token = await issueVerificationToken(email, verificationPurposes.email, 24 * 60 * 60_000);
    const actionUrl = `${baseUrl()}/${parsed.data.locale}/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    const delivery = await dispatchCustomerEmail({ customerId: user.customer.id, recipient: email, templateKey: "customer-email-verification", subject: "Verify your Saranankara Oil Mart account", actionUrl });
    previewUrl = delivery.status === "development" ? delivery.previewUrl : undefined;
  }
  return { ok: true, message: "If that account needs verification, a new link has been prepared.", previewUrl };
}

export async function requestPasswordResetAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = z.object({ email: z.email(), locale: z.enum(["en", "si", "ta"]) }).safeParse(fields(form));
  if (!parsed.success) return { message: "Enter a valid email address." };
  const email = parsed.data.email.toLowerCase();
  await assertPersistentRateLimit("customer-password-reset", email, 4, 60 * 60_000);
  const user = await db.user.findUnique({ where: { email }, include: { customer: true } });
  let previewUrl: string | undefined;
  if (user?.customer) {
    const token = await issueVerificationToken(email, verificationPurposes.password, 30 * 60_000);
    const actionUrl = `${baseUrl()}/${parsed.data.locale}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    const delivery = await dispatchCustomerEmail({ customerId: user.customer.id, recipient: email, templateKey: "customer-password-reset", subject: "Reset your Saranankara Oil Mart password", actionUrl });
    previewUrl = delivery.status === "development" ? delivery.previewUrl : undefined;
  }
  return { ok: true, message: "If an account exists, password reset instructions have been prepared.", previewUrl };
}

export async function resetCustomerPasswordAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = z.object({ email: z.email(), token: z.string().min(20), password, confirmPassword: z.string() })
    .refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
    .safeParse(fields(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Please review the form." };
  const valid = await consumeVerificationToken(parsed.data.email, parsed.data.token, verificationPurposes.password);
  if (!valid) return { message: "This reset link has expired or was already used." };
  await db.user.update({ where: { email: parsed.data.email.toLowerCase() }, data: { passwordHash: await hash(parsed.data.password, 12), sessionVersion: { increment: 1 } } });
  return { ok: true, message: "Password updated. Sign in with your new password." };
}

export type { StoreLocale };
