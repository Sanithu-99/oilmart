import "server-only";

import { createHmac } from "node:crypto";

import { db } from "@/lib/db/client";
import { getEnv } from "@/lib/env";

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many attempts. Please wait and try again.");
    this.name = "RateLimitError";
  }
}

export function privateRequestKey(...parts: Array<string | null | undefined>) {
  return createHmac("sha256", getEnv().AUTH_SECRET)
    .update(parts.filter(Boolean).join("|").toLowerCase())
    .digest("hex");
}

export async function assertPersistentRateLimit(
  namespace: string,
  identity: string,
  maximum: number,
  windowMs: number,
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);
  const key = `${namespace}:${privateRequestKey(identity)}`;

  const bucket = await db.$transaction(async (tx) => {
    const current = await tx.rateLimitBucket.findUnique({ where: { key } });
    if (!current || current.expiresAt <= now) {
      return tx.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, windowStartedAt: now, expiresAt },
        update: { count: 1, windowStartedAt: now, expiresAt },
      });
    }
    return tx.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
  });

  if (bucket.count > maximum) {
    throw new RateLimitError(Math.max(1, Math.ceil((bucket.expiresAt.getTime() - now.getTime()) / 1000)));
  }
}
