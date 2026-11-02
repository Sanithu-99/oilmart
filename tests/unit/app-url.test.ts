import { describe, expect, it } from "vitest";

import { resolveAppUrl } from "@/lib/config/app-url";

describe("application URL resolution", () => {
  it("prefers the explicitly configured application URL", () => {
    expect(resolveAppUrl({ APP_URL: "https://oilmart.lk/", NEXTAUTH_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: "preview.vercel.app", VERCEL_URL: undefined })).toBe("https://oilmart.lk");
  });

  it("uses Vercel's production hostname when an explicit URL is unavailable", () => {
    expect(resolveAppUrl({ APP_URL: undefined, NEXTAUTH_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: "saranankara-oil-mart.vercel.app", VERCEL_URL: "preview.vercel.app" })).toBe("https://saranankara-oil-mart.vercel.app");
  });

  it("falls back to the local development origin", () => {
    expect(resolveAppUrl({ APP_URL: undefined, NEXTAUTH_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: undefined, VERCEL_URL: undefined })).toBe("http://localhost:3000");
  });
});
