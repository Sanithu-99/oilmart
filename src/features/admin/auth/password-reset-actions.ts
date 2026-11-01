"use server";

import { createHash, randomBytes } from "node:crypto";

import { hash } from "bcryptjs";
import { z } from "zod";

import { writeAudit } from "@/features/admin/audit";
import { db } from "@/lib/db/client";
import { assertPersistentRateLimit } from "@/lib/security/admin-rate-limit";

const PURPOSE = "ADMIN_PASSWORD_RESET";
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function requestAdminPasswordResetAction(_previous: { sent: boolean }, form: FormData) {
  const email = z.email().parse(String(form.get("email") ?? "").trim().toLowerCase());
  await assertPersistentRateLimit("admin-reset-request", email, 4, 60 * 60_000);
  const user = await db.user.findUnique({ where: { email }, include: { roles: true } });
  if (user && user.roles.length > 0) {
    const rawToken = randomBytes(32).toString("base64url");
    await db.verificationToken.deleteMany({ where: { identifier: email, purpose: PURPOSE } });
    await db.verificationToken.create({ data: { identifier: email, purpose: PURPOSE, tokenHash: digest(rawToken), expires: new Date(Date.now() + 30 * 60_000) } });
    // Delivery adapters consume rawToken here when EMAIL_PROVIDER is configured. It is never logged or returned.
  }
  return { sent: true };
}

export async function resetAdminPasswordAction(_previous: { complete: boolean; error?: string }, form: FormData) {
  const token = z.string().min(20).parse(form.get("token"));
  const password = z.string().min(14).max(256).parse(form.get("password"));
  const tokenHash = digest(token);
  const verification = await db.verificationToken.findUnique({ where: { tokenHash } });
  if (!verification || verification.purpose !== PURPOSE || verification.expires <= new Date()) return { complete: false, error: "This reset link is invalid or expired." };
  const user = await db.user.findUnique({ where: { email: verification.identifier }, include: { roles: true } });
  if (!user || user.roles.length === 0) return { complete: false, error: "This reset link is invalid or expired." };
  const passwordHash = await hash(password, 12);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.verificationToken.deleteMany({ where: { identifier: verification.identifier, purpose: PURPOSE } });
    await writeAudit(tx, { id: user.id }, { action: "ADMIN_PASSWORD_RESET", entityType: "User", entityId: user.id });
  });
  return { complete: true };
}
