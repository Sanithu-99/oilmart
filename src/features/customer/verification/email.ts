import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import { NotificationChannel } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { getEnv } from "@/lib/env";

export type EmailDispatchResult =
  | { status: "development"; previewUrl: string }
  | { status: "queued" }
  | { status: "failed" }
  | { status: "unavailable" };

export function emailDeliveryReady() {
  const env = getEnv();
  return env.EMAIL_PROVIDER === "resend" && Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export async function dispatchCustomerEmail(input: {
  customerId?: string;
  recipient: string;
  templateKey: string;
  subject: string;
  actionUrl: string;
}): Promise<EmailDispatchResult> {
  const env = getEnv();
  const provider = env.EMAIL_PROVIDER;
  if (provider === "development" && process.env.NODE_ENV !== "production") {
    return { status: "development", previewUrl: input.actionUrl };
  }
  if (!emailDeliveryReady()) return { status: "unavailable" };
  if (!z.url().safeParse(input.actionUrl).success) return { status: "failed" };
  const recipient = z.email().safeParse(input.recipient);
  const sender = env.EMAIL_FROM!.trim();
  const senderAddress = sender.match(/^[^<>\r\n]+<([^<>\r\n]+)>$/)?.[1] ?? sender;
  const actionUrl = new URL(input.actionUrl);
  const appUrl = new URL(env.APP_URL);
  if (!recipient.success || !z.email().safeParse(senderAddress).success || /[\r\n]/.test(input.subject) || actionUrl.origin !== appUrl.origin || actionUrl.username || actionUrl.password || (actionUrl.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(actionUrl.hostname)))) return { status: "failed" };
  const idempotencyKey = createHash("sha256").update(`${input.templateKey}|${input.recipient}|${input.actionUrl}`).digest("hex");
  const notification = await db.notification.create({
    data: {
      customerId: input.customerId,
      channel: NotificationChannel.EMAIL,
      templateKey: input.templateKey,
      recipient: input.recipient,
      subject: input.subject,
      // Verification URLs contain bearer tokens and must never enter an outbox or log.
      payload: { provider: "resend" },
      status: "PROCESSING",
      attempts: 1,
      idempotencyKey,
    },
  });
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: JSON.stringify({ from: sender, to: [recipient.data], subject: input.subject, text: `${input.subject}\n\nOpen this one-time link:\n${input.actionUrl}\n\nIf you did not request this, ignore this email. Do not share the link.` }),
    });
    if (!response.ok) throw new Error("Delivery provider did not accept the email");
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string" || !result.id) throw new Error("Delivery provider did not acknowledge the email");
    await db.notification.update({ where: { id: notification.id }, data: { status: "SENT", sentAt: new Date(), payload: { provider: "resend", providerMessageId: result.id } } });
    return { status: "queued" };
  } catch {
    await db.notification.update({ where: { id: notification.id }, data: { status: "FAILED", lastError: "Email provider delivery failed. Request a new link." } });
    return { status: "failed" };
  }
}
