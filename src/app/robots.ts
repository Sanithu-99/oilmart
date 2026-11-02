import type { MetadataRoute } from "next";

import { resolveAppUrl } from "@/lib/config/app-url";

export default function robots(): MetadataRoute.Robots {
  const base = resolveAppUrl();
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/*/cart"] }, sitemap: `${base}/sitemap.xml` };
}
