import "server-only";

import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { UserStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { assertPersistentRateLimit } from "@/lib/security/admin-rate-limit";

const credentialsSchema = z.object({ email: z.email(), password: z.string().min(1).max(256) });
process.env.NEXTAUTH_URL ??= getEnv().APP_URL;

export const authOptions: NextAuthOptions = {
  secret: getEnv().AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Admin credentials",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.trim().toLowerCase();
        const forwarded = request.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() ?? "unknown";
        await assertPersistentRateLimit("admin-login", `${ip}|${email}`, 8, 15 * 60_000);

        const user = await db.user.findUnique({
          where: { email },
          include: { roles: true },
        });
        if (!user?.passwordHash || user.status !== UserStatus.ACTIVE || user.roles.length === 0) return null;
        if (!(await compare(parsed.data.password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email, authScope: "admin", sessionVersion: user.sessionVersion };
      },
    }),
    CredentialsProvider({
      id: "customer-credentials",
      name: "Customer credentials",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.trim().toLowerCase();
        const forwarded = request.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() ?? "unknown";
        await assertPersistentRateLimit("customer-login", `${ip}|${email}`, 10, 15 * 60_000);

        const user = await db.user.findUnique({ where: { email }, include: { customer: true } });
        if (!user?.customer || !user.passwordHash || !user.emailVerified || user.status !== UserStatus.ACTIVE) return null;
        if (!(await compare(parsed.data.password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email, authScope: "customer", sessionVersion: user.sessionVersion };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.authScope = user.authScope;
        token.sessionVersion = user.sessionVersion;
      } else if (token.sub) {
        const current = await db.user.findUnique({ where: { id: token.sub }, select: { status: true, sessionVersion: true } });
        if (!current || current.status !== UserStatus.ACTIVE || (token.sessionVersion != null && token.sessionVersion !== current.sessionVersion)) {
          delete token.sub;
          delete token.authScope;
          delete token.sessionVersion;
        } else if (token.sessionVersion == null) {
          token.sessionVersion = current.sessionVersion;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.authScope = token.authScope;
      }
      return session;
    },
  },
};
