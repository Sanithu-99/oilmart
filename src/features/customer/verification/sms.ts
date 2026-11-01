import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { NotificationChannel } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { isOtpChallengeUsable, normalizeSriLankanMobile } from "./phone";

export { normalizeSriLankanMobile } from "./phone";

function otpHash(challengeId: string, code: string) {
  return createHmac("sha256", getEnv().AUTH_SECRET).update(`${challengeId}:${code}`).digest("hex");
}

export async function issuePhoneOtp(userId: string, phoneInput: string) {
  const phone = normalizeSriLankanMobile(phoneInput);
  const recent = await db.phoneVerificationChallenge.findFirst({
    where: { userId, phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (recent?.resendAvailableAt && recent.resendAvailableAt > new Date()) throw new Error("Please wait before requesting another code");
  const id = crypto.randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.phoneVerificationChallenge.create({
    data: {
      id,
      userId,
      phone,
      otpHash: otpHash(id, code),
      expiresAt: new Date(Date.now() + 10 * 60_000),
      resendAvailableAt: new Date(Date.now() + 60_000),
    },
  });
  const provider = getEnv().SMS_PROVIDER;
  if (provider === "development" && process.env.NODE_ENV !== "production") return { status: "development" as const, challengeId: id, phone, code };
  if (!provider) return { status: "unavailable" as const, challengeId: id, phone };
  const customer = await db.customerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (customer) await db.notification.create({
    data: { customerId: customer.id, channel: NotificationChannel.SMS, templateKey: "phone-verification", recipient: phone, payload: { challengeId: id }, idempotencyKey: `phone-verification:${id}` },
  });
  return { status: "queued" as const, challengeId: id, phone };
}

export async function verifyPhoneOtp(userId: string, challengeId: string, code: string) {
  return db.$transaction(async (tx) => {
    const challenge = await tx.phoneVerificationChallenge.findFirst({ where: { id: challengeId, userId } });
    if (!challenge || !isOtpChallengeUsable(challenge)) return false;
    const expected = Buffer.from(challenge.otpHash, "hex");
    const actual = Buffer.from(otpHash(challenge.id, code), "hex");
    const valid = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (!valid) {
      await tx.phoneVerificationChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      return false;
    }
    await tx.phoneVerificationChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    await tx.user.update({ where: { id: userId }, data: { phone: challenge.phone, phoneVerifiedAt: new Date() } });
    return true;
  });
}
