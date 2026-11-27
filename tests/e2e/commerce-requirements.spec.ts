import { expect, test } from "@playwright/test";

test.setTimeout(120000);
const ready = expect.configure({ timeout: 30000 });

test("uses source sections, removes sort and fitment selectors, and shows price notices", async ({ page }) => {
  await page.goto("/en/products", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("combobox", { name: "Sort", exact: true })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: /vehicle/i })).toHaveCount(0);
  const section = page.getByRole("combobox", { name: "Catalogue section", exact: true });
  await ready(section).toBeVisible();
  await section.selectOption({ label: "Caltex - Passenger Car Motor Oils" });
  await expect(page.locator(".discovery-product-card").first()).toBeVisible();
  await expect(page).toHaveURL(/section=/);
  await expect(page.locator(".discovery-product-card .price-change-notice").first()).toHaveText("Prices are subject to change.");
  const search = page.getByRole("textbox", { name: "Search products", exact: true });
  await search.fill("no-such-product-zzzz");
  await expect(page.locator(".catalog-empty")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(search).toHaveValue("");
  await search.fill("Havoline Formula");
  await page.locator(".discovery-product-link").first().click();
  await page.waitForURL(/\/products\/.+/, { timeout: 60000 });
  await ready(page.locator(".purchase-stock-notice")).toContainText("only after the shop confirms stock");
  await expect(page.locator(".price-change-notice").first()).toHaveCSS("font-size", "11.52px");
  const sizes = page.getByRole("combobox", { name: "Choose size", exact: true }).first();
  await expect(sizes).toBeVisible();
  await expect(sizes).toHaveCSS("min-height", "44px");
  if (await sizes.count()) {
    await sizes.focus();
    await sizes.press("ArrowDown");
    await sizes.press("Enter");
    await expect(page.locator(".product-options")).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Request a quotation", exact: true })).toBeVisible();
  await expect(page.locator(".product-grid .product-card").first()).toBeVisible();
  await expect(page.getByText(/vehicle compatibility/i)).toHaveCount(0);
  await page.screenshot({ path: `test-results/commerce-${test.info().project.name}.png`, fullPage: true });
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
});

test("protects customer request history and administrator approval", async ({ page }) => {
  await page.goto("/en/requests");
  await page.waitForURL(/\/en\/login/, { timeout: 60000 });
  await page.goto("/admin/requests");
  await page.waitForURL(/\/admin\/login/, { timeout: 60000 });
});
