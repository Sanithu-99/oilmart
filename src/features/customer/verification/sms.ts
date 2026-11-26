import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { assertPersistentRateLimit } from "@/lib/security/admin-rate-limit";
import { sendPhoneOtp, smsGatewayReady } from "./sms-provider";
import { db } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { isOtpChallengeUsable, normalizeSriLankanMobile } from "./phone";

export { normalizeSriLankanMobile } from "./phone";

function otpHash(challengeId: string, code: string) {
  return createHmac("sha256", getEnv().AUTH_SECRET).update(`${challengeId}:${code}`).digest("hex");
}

export async function issuePhoneOtp(userId: string, phoneInput: string) {
  const phone = normalizeSriLankanMobile(phoneInput);
  const provider = getEnv().SMS_PROVIDER;
  const preview = provider === "development" && process.env.NODE_ENV !== "production";
  if (!preview && !smsGatewayReady()) return { status: "unavailable" as const, challengeId: "", phone };
  await assertPersistentRateLimit("phone-otp-user", userId, 6, 60 * 60_000);
  await assertPersistentRateLimit("phone-otp-recipient", phone, 6, 60 * 60_000);
  const id = crypto.randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.$transaction(async (tx) => {
    const recent = await tx.phoneVerificationChallenge.findFirst({ where: { userId, phone }, orderBy: { createdAt: "desc" } });
    if (recent?.resendAvailableAt && recent.resendAvailableAt > new Date()) throw new Error("Please wait before requesting another code");
    await tx.phoneVerificationChallenge.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
    await tx.phoneVerificationChallenge.create({ data: { id, userId, phone, otpHash: otpHash(id, code), expiresAt: new Date(Date.now() + 10 * 60_000), resendAvailableAt: new Date(Date.now() + 60_000) } });
  }, { isolationLevel: "Serializable" });
  if (preview) return { status: "development" as const, challengeId: id, phone, code };
  try {
    if (!await sendPhoneOtp(phone, code, id)) throw new Error("Unavailable");
    return { status: "queued" as const, challengeId: id, phone };
  } catch {
    await db.phoneVerificationChallenge.update({ where: { id }, data: { consumedAt: new Date() } });
    throw new Error("SMS could not be queued. Please try again later.");
  }
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
    const consumed = await tx.phoneVerificationChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, attempts: { lt: 5 }, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    if (consumed.count !== 1) return false;
    await tx.user.update({ where: { id: userId }, data: { phone: challenge.phone, phoneVerifiedAt: new Date() } });
    return true;
  }, { isolationLevel: "Serializable" });
}
