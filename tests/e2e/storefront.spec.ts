import { expect, test } from "@playwright/test";

test("redirects to the English storefront and renders database content", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page).toHaveTitle(/Saranankara Oil Mart/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Premium lubricants");
  await expect(page.getByRole("heading", { name: "Featured products" })).toBeVisible();
  await expect(page.locator(".product-card").first()).not.toContainText("Sample");
  expect(consoleErrors).toEqual([]);
});

test("catalog filters are URL-driven and server rendered", async ({ page }) => {
  await page.goto("/en/products?category=engine-oils&availability=in");
  await expect(page.locator('select[name="category"]')).toHaveValue("engine-oils");
  await expect(page.locator('select[name="availability"]')).toHaveValue("in");
  await expect(page.locator(".product-card").first()).toBeVisible();
});

test("the storefront starts with classic colours and persists the graphite palette when selected", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en");
  await expect(page.locator("html")).not.toHaveAttribute("data-store-theme", "graphite");

  const switcher = page.getByRole("button", { name: "Use graphite colours" });
  await switcher.click();
  await expect(page.locator("html")).toHaveAttribute("data-store-theme", "graphite");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--store-deep").trim())).toBe("#171b1f");

  await page.goto("/en/products");
  await expect(page.locator("html")).toHaveAttribute("data-store-theme", "graphite");
  await page.getByRole("button", { name: "Use classic green colours" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-store-theme", "graphite");
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
  await page.goto("/en/products/caltex-havoline-formula-10w30-1-l-0a398b");
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await expect(page.getByRole("dialog", { name: "Shopping cart" })).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Caltex Havoline Formula 10W30 (1 L)")).toBeVisible();
  const whatsappOrder = page.getByRole("dialog").getByRole("link", { name: "Order on WhatsApp" });
  await expect(whatsappOrder).toHaveAttribute("href", /^https:\/\/wa\.me\/94715716717\?text=/);
  const whatsappMessage = new URL((await whatsappOrder.getAttribute("href"))!).searchParams.get("text");
  expect(whatsappMessage).toContain("1 × Caltex Havoline Formula 10W30 (1 L)");
  await page.getByRole("link", { name: "View cart" }).click();
  await expect(page).toHaveURL(/\/en\/cart$/);
  await expect(page.getByRole("link", { name: "Caltex Havoline Formula 10W30 (1 L)" })).toBeVisible();
  const updated = page.waitForResponse((response) => response.url().includes("/api/cart/items/") && response.request().method() === "PATCH");
  await page.getByRole("button", { name: "Increase" }).click();
  expect((await updated).ok()).toBe(true);
  await expect(page.locator(".quantity-control").getByText("2")).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.locator(".quantity-control").getByText("2")).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
});

test("products without a verified retail price offer equal call and WhatsApp confirmation actions", async ({ page }) => {
  await page.goto("/en/products/caltex-havoline-prods-eco5-sae-5w30-4-l-e920a9");
  await expect(page.getByRole("heading", { name: "Caltex Havoline ProDS ECO5 SAE 5W30 (4 L)" })).toBeVisible();
  const productSection = page.locator("section.site-container.grid").first();
  await expect(productSection.getByText("Contact for price", { exact: true })).toBeVisible();
  const call = productSection.getByRole("link", { name: /Call to confirm/ });
  const whatsapp = productSection.getByRole("link", { name: /WhatsApp to confirm/ });
  await expect(call).toHaveAttribute("href", /^tel:/);
  await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/94715716717\?text=/);
  const message = new URL((await whatsapp.getAttribute("href"))!).searchParams.get("text");
  expect(message).toContain("Caltex Havoline ProDS ECO5 SAE 5W30 (4 L)");
  const [callBox, whatsappBox] = await Promise.all([call.boundingBox(), whatsapp.boundingBox()]);
  expect(Math.abs(callBox!.width - whatsappBox!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(callBox!.height - whatsappBox!.height)).toBeLessThanOrEqual(1);
  await expect(productSection.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
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

  for (const route of ["/en/products", "/en/products/caltex-havoline-formula-10w30-1-l-0a398b", "/en/cart"]) {
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
