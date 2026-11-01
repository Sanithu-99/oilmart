import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/features/admin/auth/options";
import { UserStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getAuthorizedAdmin(permission?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await db.user.findFirst({
    where: { id: session.user.id, status: UserStatus.ACTIVE },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!user || user.roles.length === 0) return null;
  const permissions = new Set(user.roles.flatMap(({ role }) => role.permissions.map(({ permission: item }) => item.key)));
  if (permission && !permissions.has(permission)) return null;

  const requestHeaders = await headers();
  return {
    id: user.id,
    name: user.name ?? user.email ?? "Administrator",
    email: user.email,
    roles: user.roles.map(({ role }) => role.key),
    permissions,
    ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip"),
    userAgent: requestHeaders.get("user-agent"),
  };
}

export async function requireAdmin(permission?: string) {
  const actor = await getAuthorizedAdmin(permission);
  if (!actor) throw new AuthorizationError();
  return actor;
}

export async function requireAdminPage(permission?: string) {
  const actor = await getAuthorizedAdmin();
  if (!actor) redirect(`/admin/login?next=${encodeURIComponent("/admin")}`);
  if (permission && !actor.permissions.has(permission)) redirect("/admin?forbidden=1");
  return actor;
}
