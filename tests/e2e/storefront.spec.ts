import { expect, test } from "@playwright/test";

test("redirects to the English storefront and renders database content", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page).toHaveTitle(/Saranankara Oil Mart/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Premium lubricants");
  await expect(page.getByRole("heading", { name: "Featured products" })).toBeVisible();
  await expect(page.locator(".product-card").first()).toContainText("Sample");
  expect(consoleErrors).toEqual([]);
});

test("catalog filters are URL-driven and server rendered", async ({ page }) => {
  await page.goto("/en/products?category=engine-oils&availability=in");
  await expect(page.locator('select[name="category"]')).toHaveValue("engine-oils");
  await expect(page.locator('select[name="availability"]')).toHaveValue("in");
  await expect(page.getByRole("heading", { name: "Sample Engine Oil 5W-30" })).toBeVisible();
});

test("Sinhala and Tamil routes render translated core interface and language attributes", async ({ page }) => {
  await page.goto("/si");
  await expect(page.locator("html")).toHaveAttribute("lang", "si");
  await expect(page.getByRole("link", { name: "ලිහිසි තෙල් මිලදී ගන්න" })).toBeVisible();
  await page.goto("/ta/products");
  await expect(page.locator("html")).toHaveAttribute("lang", "ta");
  await expect(page.getByRole("heading", { name: "சரியான மசகு எண்ணெயைக் கண்டறியுங்கள்" })).toBeVisible();
});

test("guest cart persists and revalidates add, update, and remove", async ({ page }) => {
  await page.goto("/en/products/sample-engine-oil-5w-30-4l");
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await expect(page.getByRole("dialog", { name: "Shopping cart" })).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Sample Engine Oil 5W-30")).toBeVisible();
  await page.getByRole("link", { name: "View cart" }).click();
  await expect(page).toHaveURL(/\/en\/cart$/);
  await expect(page.getByRole("link", { name: "Sample Engine Oil 5W-30" })).toBeVisible();
  const updated = page.waitForResponse((response) => response.url().includes("/api/cart/items/") && response.request().method() === "PATCH");
  await page.getByRole("button", { name: "Increase" }).click();
  expect((await updated).ok()).toBe(true);
  await expect(page.locator(".quantity-control").getByText("2")).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.locator(".quantity-control").getByText("2")).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
});

test("storefront stays within all required responsive widths", async ({ page }) => {
  test.setTimeout(60_000);
  for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }

  for (const route of ["/en/products", "/en/products/sample-engine-oil-5w-30-4l", "/en/cart"]) {
    for (const width of [320, 768, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  }

  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/en");
  await page.locator("details summary").click();
  await expect(page.locator("details").getByRole("link", { name: "Shop", exact: true })).toBeVisible();
});
