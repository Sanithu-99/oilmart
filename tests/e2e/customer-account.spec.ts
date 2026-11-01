import { createHash, randomBytes, randomUUID } from "node:crypto";
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";
import { hash } from "bcryptjs";

import { FulfillmentMethod, Locale, OrderStatus, PrismaClient } from "../../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const suffix = randomUUID().slice(0, 8);
const customerEmail = `e2e-customer-${suffix}@local.invalid`;
const adminEmail = `e2e-loyalty-admin-${suffix}@local.invalid`;
const password = `Customer-${randomBytes(12).toString("base64url")}9a`;
let customerUserId = "";
let customerId = "";
let adminId = "";
let orderId = "";

test.beforeAll(async () => {
  const [passwordHash, owner, product] = await Promise.all([
    hash(password, 4),
    db.role.findUniqueOrThrow({ where: { key: "owner" } }),
    db.product.findUniqueOrThrow({ where: { slug: "caltex-havoline-formula-10w30-1-l-0a398b" }, include: { variants: true } }),
  ]);
  const customerUser = await db.user.create({ data: { name: "Phase Four Customer", email: customerEmail, emailVerified: new Date(), passwordHash, customer: { create: { firstName: "Phase", lastName: "Customer", locale: Locale.EN, termsAcceptedAt: new Date(), privacyAcceptedAt: new Date() } } }, include: { customer: true } });
  customerUserId = customerUser.id;
  customerId = customerUser.customer!.id;
  const admin = await db.user.create({ data: { name: "Loyalty Reviewer", email: adminEmail, passwordHash, roles: { create: { roleId: owner.id } } } });
  adminId = admin.id;
  const order = await db.order.create({ data: {
    orderNumber: `E2E-${suffix.toUpperCase()}`, customerId, status: OrderStatus.PROCESSING, fulfillmentMethod: FulfillmentMethod.PICKUP, locale: Locale.EN,
    customerEmail, customerPhone: "+94771234567", customerName: "Phase Four Customer", subtotalMinor: product.standardPriceMinor, totalMinor: product.standardPriceMinor, pricingSnapshot: { source: "e2e" }, placedAt: new Date(),
    items: { create: { productId: product.id, variantId: product.variants[0]!.id, sku: product.variants[0]!.sku, productName: product.name, variantName: product.variants[0]!.name, quantity: "1", unitPriceMinor: product.standardPriceMinor, lineTotalMinor: product.standardPriceMinor } },
    statusHistory: { create: { toStatus: OrderStatus.PROCESSING, reason: "E2E fixture" } },
  } });
  orderId = order.id;
});

test.afterAll(async () => {
  if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined);
  if (adminId || customerUserId) await db.auditLog.deleteMany({ where: { actorId: { in: [adminId, customerUserId].filter(Boolean) } } });
  if (customerUserId) await db.user.delete({ where: { id: customerUserId } }).catch(() => undefined);
  if (adminId) await db.user.delete({ where: { id: adminId } }).catch(() => undefined);
  await db.$disconnect();
});

test("customer account, cart merge, scoped orders, addresses, loyalty review, and reorder", async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/en/products/caltex-havoline-formula-10w30-1-l-0a398b");
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await expect(page.getByRole("dialog", { name: "Shopping cart" })).toBeVisible();

  await page.goto("/en/account");
  await expect(page).toHaveURL(/\/en\/login/);
  await page.getByLabel("Email address").fill(customerEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  await expect(page.getByRole("heading", { name: "Profile details" })).toBeVisible();

  await page.goto("/en/cart");
  await expect(page.getByRole("link", { name: "Caltex Havoline Formula 10W30 (1 L)" })).toBeVisible();
  await page.goto("/en/account/addresses");
  await page.getByLabel("Label").last().fill("Workshop");
  await page.getByLabel("Recipient").last().fill("Phase Four Customer");
  await page.getByLabel("Phone").last().fill("0771234567");
  await page.getByLabel("Address line 1").last().fill("70 Hill Street");
  await page.getByLabel("City").last().fill("Dehiwala");
  await page.getByRole("button", { name: "Add address" }).click();
  await expect(page.getByText("Address saved.")).toBeVisible();
  await expect(page.getByText("Workshop").first()).toBeVisible();

  await page.goto("/en/account/orders");
  await expect(page.getByText(`Order #E2E-${suffix.toUpperCase()}`).first()).toBeVisible();
  await page.goto(`/en/account/orders/${orderId}`);
  await expect(page.getByRole("heading", { name: `#E2E-${suffix.toUpperCase()}` })).toBeVisible();
  await page.goto("/en/account/orders/not-an-owned-order");
  await expect(page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();

  await page.goto("/en/account/loyalty");
  await page.getByRole("button", { name: "Submit loyalty application" }).click();
  await expect(page.getByRole("heading", { name: "PENDING" })).toBeVisible();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto("http://127.0.0.1:3000/admin/login");
  await adminPage.getByLabel("Email address").fill(adminEmail);
  await adminPage.getByLabel("Password").fill(password);
  await adminPage.getByRole("button", { name: "Sign in securely" }).click();
  await expect(adminPage).toHaveURL(/\/admin$/);
  await adminPage.goto(`http://127.0.0.1:3000/admin/loyalty?q=${encodeURIComponent(customerEmail)}`);
  const application = adminPage.locator("article", { hasText: customerEmail });
  await application.locator('select[name="status"]').selectOption("ACTIVE");
  await application.locator('input[name="notes"]').fill("Identity reviewed in automated verification");
  await application.getByRole("button", { name: "Record decision" }).click();
  await expect(application.getByText("ACTIVE", { exact: true }).first()).toBeVisible();
  await adminContext.close();

  await page.goto("/en/account/loyalty");
  await expect(page.getByRole("heading", { name: "ACTIVE" })).toBeVisible();
  if (testInfo.project.name === "chromium") await page.screenshot({ path: "docs/design/phase4/customer-account-implementation.png", fullPage: true });
  await page.goto(`/en/account/orders/${orderId}`);
  await page.getByRole("button", { name: "Reorder available items" }).click();
  await expect(page).toHaveURL(/\/en\/cart\?reordered=1&unavailable=0/);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("customer registration, consent evidence, email verification, and password reset", async ({ page }) => {
  test.setTimeout(60_000);
  const registrationEmail = `e2e-registration-${randomUUID().slice(0, 8)}@local.invalid`;
  const originalPassword = `Original-${randomBytes(10).toString("base64url")}8a`;
  const replacementPassword = `Replacement-${randomBytes(10).toString("base64url")}9a`;
  let registeredUserId = "";
  try {
    await page.goto("/en/register");
    await page.getByLabel("First name").fill("Registration");
    await page.getByLabel("Last name").fill("Journey");
    await page.getByLabel("Email address").fill(registrationEmail);
    await page.locator('input[name="password"]').fill(originalPassword);
    await page.getByLabel("Confirm password").fill(originalPassword);
    await page.getByRole("checkbox", { name: /Terms/ }).check();
    await page.getByRole("checkbox", { name: /Email me/ }).check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/Account created/)).toBeVisible();

    const registered = await db.user.findUniqueOrThrow({ where: { email: registrationEmail }, include: { customer: { include: { consents: true } } } });
    registeredUserId = registered.id;
    expect(registered.customer?.termsAcceptedAt).not.toBeNull();
    expect(registered.customer?.privacyAcceptedAt).not.toBeNull();
    expect(registered.customer?.consents.some((consent) => consent.type === "EMAIL_MARKETING" && consent.granted)).toBe(true);

    const verificationToken = randomBytes(32).toString("base64url");
    await db.verificationToken.deleteMany({ where: { identifier: registrationEmail } });
    await db.verificationToken.create({ data: { identifier: registrationEmail, purpose: "CUSTOMER_EMAIL_VERIFICATION", tokenHash: createHash("sha256").update(verificationToken).digest("hex"), expires: new Date(Date.now() + 60_000) } });
    await page.goto(`/en/verify-email?email=${encodeURIComponent(registrationEmail)}&token=${verificationToken}`);
    await page.getByRole("button", { name: "Verify email" }).click();
    await expect(page.getByText("Your email is verified. You can now sign in.")).toBeVisible();

    const resetToken = randomBytes(32).toString("base64url");
    await db.verificationToken.create({ data: { identifier: registrationEmail, purpose: "CUSTOMER_PASSWORD_RESET", tokenHash: createHash("sha256").update(resetToken).digest("hex"), expires: new Date(Date.now() + 60_000) } });
    await page.goto(`/en/reset-password?email=${encodeURIComponent(registrationEmail)}&token=${resetToken}`);
    await page.getByLabel("New password").fill(replacementPassword);
    await page.getByLabel("Confirm password").fill(replacementPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Password updated. Sign in with your new password.")).toBeVisible();

    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(registrationEmail);
    await page.getByLabel("Password").fill(replacementPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/account$/);
  } finally {
    await db.verificationToken.deleteMany({ where: { identifier: registrationEmail } });
    if (registeredUserId) await db.auditLog.deleteMany({ where: { actorId: registeredUserId } });
    if (registeredUserId) await db.user.delete({ where: { id: registeredUserId } }).catch(() => undefined);
  }
});
