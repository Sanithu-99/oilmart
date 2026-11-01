import { createHash, randomBytes } from "node:crypto";

export const CART_COOKIE = "som_guest_cart";

export function createCartToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCartToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const cartCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
