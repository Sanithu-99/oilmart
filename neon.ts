import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  preview: {
    realtime: true,
  },
  auth: true,
  aiGateway: true,
  functions: {
    health: {
      name: "Oil Mart integration health",
      source: "./health.ts",
      env: {
        ORIGIN_SECRET: process.env.NEON_FUNCTION_ORIGIN_SECRET ?? process.env.AUTH_SECRET!,
      },
    },
  },
  buckets: {
    "product-images": { access: "public_read" },
  },
  branch: (branch) => {
    if (branch.isDefault) {
      return {};
    }
    if (!branch.exists) {
      return { ttl: "7d" };
    }
    return {};
  },
});
