import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    authScope?: "admin" | "customer";
    sessionVersion?: number;
  }

  interface Session {
    user: DefaultSession["user"] & { id: string; authScope?: "admin" | "customer" };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    authScope?: "admin" | "customer";
    sessionVersion?: number;
  }
}
