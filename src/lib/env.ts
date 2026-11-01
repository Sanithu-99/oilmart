import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEON_BRANCH: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEON_AUTH_BASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEON_AUTH_JWKS_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEON_AI_GATEWAY_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEON_AI_GATEWAY_BASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEON_REALTIME_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEON_REALTIME_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEON_FUNCTION_HEALTH_BASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  NEON_FUNCTION_ORIGIN_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  AWS_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AWS_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AWS_ENDPOINT_URL_S3: z.preprocess(emptyToUndefined, z.url().optional()),
  AWS_REGION: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
  S3_ENDPOINT: z.preprocess(emptyToUndefined, z.url().optional()),
  S3_REGION: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  S3_BUCKET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  S3_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  S3_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  S3_PUBLIC_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  EMAIL_PROVIDER: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  SMS_PROVIDER: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  ADMIN_BOOTSTRAP_EMAIL: z.preprocess(emptyToUndefined, z.email().optional()),
  ADMIN_BOOTSTRAP_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(14).optional()),
  ADMIN_BOOTSTRAP_NAME: z.preprocess(emptyToUndefined, z.string().min(2).optional()),
});

export type AppEnv = z.infer<typeof envSchema>;

let parsedEnv: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (parsedEnv) return parsedEnv;

  const result = envSchema.safeParse({
    ...process.env,
    APP_URL:
      process.env.APP_URL ||
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      "http://localhost:3000",
  });
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration: ${fields}`);
  }

  parsedEnv = result.data;
  return parsedEnv;
}
