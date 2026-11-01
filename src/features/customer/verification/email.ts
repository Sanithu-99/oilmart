import "server-only";

import { NotificationChannel } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { getEnv } from "@/lib/env";

export type EmailDispatchResult =
  | { status: "development"; previewUrl: string }
  | { status: "queued" }
  | { status: "unavailable" };

export async function dispatchCustomerEmail(input: {
  customerId: string;
  recipient: string;
  templateKey: string;
  subject: string;
  actionUrl: string;
}): Promise<EmailDispatchResult> {
  const provider = getEnv().EMAIL_PROVIDER;
  if (provider === "development" && process.env.NODE_ENV !== "production") {
    return { status: "development", previewUrl: input.actionUrl };
  }
  if (!provider) return { status: "unavailable" };
  await db.notification.create({
    data: {
      customerId: input.customerId,
      channel: NotificationChannel.EMAIL,
      templateKey: input.templateKey,
      recipient: input.recipient,
      subject: input.subject,
      payload: { actionUrl: input.actionUrl },
      idempotencyKey: `${input.templateKey}:${input.customerId}:${Date.now()}`,
    },
  });
  return { status: "queued" };
}
