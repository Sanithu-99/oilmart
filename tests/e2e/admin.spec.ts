import { randomBytes, randomUUID } from "node:crypto";
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";
import { hash } from "bcryptjs";

import { PrismaClient } from "../../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL!;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const suffix = randomUUID().slice(0, 8);
const email = `e2e-admin-${suffix}@local.invalid`;
const password = randomBytes(24).toString("base64url");
const sku = `E2E-${suffix.toUpperCase()}`;
const slug = `e2e-managed-oil-${suffix}`;
let userId: string;

test.beforeAll(async () => {
  const owner = await db.role.findUniqueOrThrow({ where: { key: "owner" } });
  const user = await db.user.create({ data: { name: "E2E Owner", email, passwordHash: await hash(password, 4), roles: { create: { roleId: owner.id } } } });
  userId = user.id;
});

test.afterAll(async () => {
  const product = await db.product.findUnique({ where: { sku }, include: { variants: { include: { inventory: true } } } });
  if (product) {
    const inventoryIds = product.variants.flatMap((variant) => variant.inventory?.id ? [variant.inventory.id] : []);
    await db.inventoryAdjustment.deleteMany({ where: { inventoryId: { in: inventoryIds } } });
    await db.product.delete({ where: { id: product.id } });
  }
  if (userId) await db.auditLog.deleteMany({ where: { actorId: userId } });
  if (userId) await db.user.delete({ where: { id: userId } }).catch(() => undefined);
  await db.$disconnect();
});

test("admin authentication and product-to-storefront workflow", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Good morning." })).toBeVisible();

  await page.goto("/admin/products/new");
  await page.getByLabel("Product name").fill(`Managed Test Oil ${suffix}`);
  await page.getByLabel("SKU").fill(sku);
  await page.getByLabel("URL slug").fill(slug);
  await page.getByLabel("Category").selectOption({ label: "Engine Oils" });
  await page.getByLabel("Standard price (LKR)").fill("1250.50");
  await page.getByLabel("Publication").selectOption("ACTIVE");
  await page.getByRole("button", { name: "Create draft product" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/(?!new)[^?]+\?saved=1/);

  await page.goto(`/en/products/${slug}`);
  await expect(page.getByRole("heading", { name: `Managed Test Oil ${suffix}` })).toBeVisible();
  await expect(page.getByText("LKR 1,250.50", { exact: true }).first()).toBeVisible();

  await page.goto("/admin/inventory");
  const stockRecord = page.locator("details", { hasText: `Managed Test Oil ${suffix}` });
  await stockRecord.locator("summary").click();
  await stockRecord.getByLabel("Adjustment (+ / −)").fill("5.5");
  await stockRecord.getByLabel("Reason").fill("Automated receiving verification");
  await stockRecord.getByRole("button", { name: "Record adjustment" }).click();
  await expect(page).toHaveURL(/adjusted=1/);

  await page.goto(`/admin/products?q=${encodeURIComponent(sku)}`);
  const row = page.locator("tr", { hasText: sku });
  await row.getByRole("button", { name: "Archive" }).click();
  await expect(page).toHaveURL(/updated=1/);
  await page.goto(`/en/products/${slug}`);
  await expect(page.getByRole("heading", { name: "Product not found" })).toBeVisible();
});

test("admin workspace has no horizontal overflow at representative widths", async ({ page }, testInfo) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  for (const width of [320, 768, 1536]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `admin overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
  if (testInfo.project.name === "chromium") {
    await page.setViewportSize({ width: 1536, height: 1024 });
    await page.goto("/admin");
    await page.screenshot({ path: "docs/design/phase3/admin-overview-implementation.png" });
    await page.goto("/admin/products");
    await page.screenshot({ path: "docs/design/phase3/admin-catalog-implementation.png" });
  }
});
