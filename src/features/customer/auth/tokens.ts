import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { db } from "@/lib/db/client";

export const verificationPurposes = {
  email: "CUSTOMER_EMAIL_VERIFICATION",
  password: "CUSTOMER_PASSWORD_RESET",
} as const;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueVerificationToken(identifier: string, purpose: string, ttlMs: number) {
  const token = randomBytes(32).toString("base64url");
  const normalized = identifier.trim().toLowerCase();
  await db.$transaction([
    db.verificationToken.deleteMany({ where: { identifier: normalized, purpose } }),
    db.verificationToken.create({
      data: { identifier: normalized, purpose, tokenHash: hashToken(token), expires: new Date(Date.now() + ttlMs) },
    }),
  ]);
  return token;
}

export async function consumeVerificationToken(identifier: string, token: string, purpose: string) {
  const normalized = identifier.trim().toLowerCase();
  const tokenHash = hashToken(token);
  return db.$transaction(async (tx) => {
    const record = await tx.verificationToken.findFirst({
      where: { identifier: normalized, purpose, tokenHash, expires: { gt: new Date() } },
    });
    if (!record) return false;
    const consumed = await tx.verificationToken.deleteMany({ where: { tokenHash, identifier: normalized, purpose, expires: { gt: new Date() } } });
    return consumed.count === 1;
  });
}
