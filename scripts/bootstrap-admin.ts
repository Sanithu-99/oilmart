import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim();
if (!connectionString || !email || !password || !name) {
  throw new Error("DATABASE_URL and all ADMIN_BOOTSTRAP_* variables are required");
}
if (password.length < 14) throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be at least 14 characters");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const privileged = await db.user.count({ where: { roles: { some: { role: { key: { in: ["owner", "admin"] } } } } } });
  if (privileged > 0) throw new Error("A privileged administrator already exists; bootstrap refused");
  const owner = await db.role.findUnique({ where: { key: "owner" } });
  if (!owner) throw new Error("Owner role is missing. Run pnpm db:seed first.");
  const passwordHash = await hash(password, 12);
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, name, passwordHash } });
    await tx.userRole.create({ data: { userId: user.id, roleId: owner.id } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "ADMIN_BOOTSTRAPPED", entityType: "User", entityId: user.id } });
  });
  console.info("Owner administrator created successfully.");
} finally {
  await db.$disconnect();
}
