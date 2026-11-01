import "server-only";

import { createHmac, randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

const secretKeys = /password|token|secret|authorization|cookie|hash/i;

function safeJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(
    JSON.stringify(value, (key, item) => {
      if (secretKeys.test(key)) return "[REDACTED]";
      if (typeof item === "bigint") return item.toString();
      if (item && typeof item === "object" && typeof item.toJSON === "function") return item.toJSON();
      return item;
    }),
  ) as Prisma.InputJsonValue;
}

export function hashIp(ip: string | null | undefined) {
  if (!ip) return undefined;
  return createHmac("sha256", getEnv().AUTH_SECRET).update(ip).digest("hex");
}

export type AuditActor = {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
};

export async function writeAudit(
  tx: Prisma.TransactionClient,
  actor: AuditActor | null,
  input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
    metadata?: unknown;
  },
) {
  return tx.auditLog.create({
    data: {
      actorId: actor?.id,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: safeJson(input.before),
      after: safeJson(input.after),
      metadata: safeJson(input.metadata),
      correlationId: randomUUID(),
      ipHash: hashIp(actor?.ip),
      userAgent: actor?.userAgent?.slice(0, 500),
    },
  });
}
