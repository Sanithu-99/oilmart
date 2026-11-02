type AppUrlEnvironment = {
  APP_URL?: string;
  NEXTAUTH_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
};

export function resolveAppUrl(environment: AppUrlEnvironment = process.env) {
  const explicitUrl = environment.APP_URL || environment.NEXTAUTH_URL;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const vercelHostname = environment.VERCEL_PROJECT_PRODUCTION_URL || environment.VERCEL_URL;
  if (vercelHostname) return `https://${vercelHostname.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
