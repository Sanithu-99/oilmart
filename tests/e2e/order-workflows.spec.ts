import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";

// Exercise the actual client components with fake action responses, never live writes.
const localRequire = createRequire(import.meta.url);
const bundlerRequire = createRequire(localRequire.resolve("tsx/package.json"));
const bundler = bundlerRequire("esbuild") as { build(options: Record<string, unknown>): Promise<{ outputFiles: { text: string }[] }> };
type PluginBuild = {
  onResolve(options: { filter: RegExp }, callback: (args: { path: string }) => { path: string; namespace?: string }): void;
  onLoad(options: { filter: RegExp; namespace: string }, callback: () => { contents: string; loader: string; resolveDir?: string }): void;
};
let bundle = "", stylesheet = "";
test.setTimeout(120000);
test.beforeAll(async ({ request }) => {
  const html = await (await request.get("/en")).text();
  const tag = html.match(/<link[^>]*rel="stylesheet"[^>]*>/)?.[0];
  stylesheet = tag?.match(/href="([^"]+)"/)?.[1] ?? "";
  const result = await bundler.build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import {CheckoutForm} from '@/components/customer/checkout-form';
      import {OrderReview} from '@/components/admin/order-review';
      import {PaymentSettingsForm} from '@/components/admin/payment-settings';
      import {CommerceBatchForm} from '@/components/admin/commerce-batch-form';
      import {PayHereCheckout} from '@/components/customer/payhere-checkout';
      const root=createRoot(document.getElementById('app'));
      window.fixtureMode='error';
      window.showFixture=(kind)=>root.render(<main className="site-container py-8"><p>Isolated interaction test — no real orders or payments</p><section className="detail-panel mt-5">
        {kind==='payhere' ? <><h1>Pay confirmed order</h1><PayHereCheckout orderId="fixture" updatedAt="2026-11-26T00:00:00.000Z" locale="en"/></> : kind==='batch' ? <><h1>Catalogue setup</h1><CommerceBatchForm products={[{id:'p1',updatedAt:'2026-11-26T00:00:00.000Z',name:'Test oil 1 litre',sku:'OIL-1',retail:'10000',loyalty:null,preorders:false}]}/></> : kind==='checkout' ? <><h1>Review request</h1><CheckoutForm source="cart" sourceId="fixture" total="10000" locale="en" methods={['CASH','BANK']}/></> : kind==='review' ? <><h1>Verify order</h1><OrderReview id="fixture" updatedAt="2026-11-25T12:00:00Z" status="PENDING_PAYMENT" total="10000" hosted={true} feeOrder={false}/></> : <><h1>Owner payment settings</h1><PaymentSettingsForm updatedAt="" settings={{cashEnabled:true,bankEnabled:false,phoneEnabled:false,hostedEnabled:false,bankName:'',accountName:'',accountNumber:'',branch:'',receivingPhone:'',phoneAccountName:'',hostedName:'',hostedHost:'',instructions:''}}/></>}
      </section></main>);
      window.showFixture('checkout');`, resolveDir: process.cwd(), sourcefile: "browser-fixture.tsx", loader: "tsx" },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' },
    plugins: [{ name: "isolated-actions", setup(build: PluginBuild) {
      build.onResolve({ filter: /^next\/link$/ }, () => ({ path: "next-link", namespace: "link" }));
      build.onLoad({ filter: /.*/, namespace: "link" }, () => ({ loader: "js", resolveDir: process.cwd(), contents: "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}" }));
      build.onResolve({ filter: /^@\/features\/(orders|payments)\/actions$/ }, () => ({ path: "actions", namespace: "actions" }));
      build.onResolve({ filter: /^@\/features\/admin\/commerce-setup-actions$/ }, () => ({ path: "batch-actions", namespace: "batch-actions" }));
      build.onResolve({ filter: /^@\/features\/payments\/payhere-actions$/ }, () => ({ path: "payhere-actions", namespace: "payhere-actions" }));
      build.onLoad({ filter: /.*/, namespace: "payhere-actions" }, () => ({ loader: "js", contents: `export async function preparePayHereAction(){await new Promise(r=>setTimeout(r,200));return window.fixtureMode==='error'?{error:'Connection interrupted. Try again.'}:{checkout:{endpoint:'https://sandbox.payhere.lk/pay/checkout',sandbox:true,fields:{merchant_id:'123456',order_id:'test-only-attempt',amount:'100.00',currency:'LKR',hash:'test-only-hash'}}}}` }));
      build.onLoad({ filter: /.*/, namespace: "batch-actions" }, () => ({ loader: "js", contents: `export async function setupCommerceBatchAction(){await new Promise(r=>setTimeout(r,200));return window.fixtureMode==='error'?{error:'Connection interrupted. Try again.'}:{success:'Updated selected products.'}}` }));
      build.onLoad({ filter: /.*/, namespace: "actions" }, () => ({ loader: "js", contents: `async function action(){await new Promise(r=>setTimeout(r,200));return window.fixtureMode==='error'?{error:'Connection interrupted. Try again.'}:{message:'Saved',orderId:'fixture-order'}};export const checkoutAction=action;export const manageOrderAction=action;export const reportPaymentAction=action;export const savePaymentSettingsAction=action;` }));
      build.onResolve({ filter: /^@\// }, ({ path: name }) => { const base = path.resolve("src", name.slice(2)); return { path: [base, `${base}.tsx`, `${base}.ts`].find(existsSync) ?? base }; });
    } }],
  });
  bundle = result.outputFiles[0]!.text;
});
test.beforeEach(async ({ page }) => {
  await page.route("**/__commerce-bundle.js", (route) => route.fulfill({ contentType: "text/javascript", body: bundle }));
  await page.route("**/__commerce-ui", (route) => route.fulfill({ contentType: "text/html", body: `<html lang="en" style="--font-noto-sans:Arial;--font-noto-sans-sinhala:Arial;--font-noto-sans-tamil:Arial;--font-geist-mono:monospace"><head><meta name="viewport" content="width=device-width,initial-scale=1">${stylesheet ? `<link rel="stylesheet" href="${stylesheet}">` : ""}</head><body><div id="app" class="storefront-shell"></div><script src="/__commerce-bundle.js"></script></body></html>` }));
});

test("checkout acknowledges stock confirmation and preserves choice after failure", async ({ page }) => {
  await page.goto("/__commerce-ui");
  const submit = page.getByRole("button", { name: "Send order request" });
  await expect(submit).toBeDisabled();
  const method = page.getByRole("combobox", { name: "Payment method" });
  await method.selectOption("BANK");
  await method.focus(); await method.press("Alt+ArrowDown"); await method.press("Escape");
  await method.selectOption("BANK");
  await page.getByRole("checkbox").check();
  await submit.click();
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Connection interrupted");
  await expect(method).toHaveValue("BANK"); await expect(page.getByRole("checkbox")).toBeChecked();
  await page.evaluate(() => { (window as unknown as { fixtureMode: string }).fixtureMode = "success"; });
  await submit.click(); await expect(page.getByRole("link", { name: "View order" })).toHaveAttribute("href", "/en/account/orders/fixture-order");
});

test("payment verification requires receipt acknowledgement and keeps fields on failure", async ({ page }) => {
  await page.goto("/__commerce-ui");
  await page.evaluate(() => (window as unknown as { showFixture: (name: string) => void }).showFixture("review"));
  await page.getByLabel("Note visible to the customer").fill("Confirmed incoming bank transfer");
  await page.getByLabel("Verified transaction / cash receipt reference").fill("BANK123");
  await page.getByLabel("Amount actually received (LKR)").fill("100.00");
  const submit = page.getByRole("button", { name: "Save order review" });
  await expect(submit).toBeDisabled();
  await page.getByRole("checkbox").check(); await submit.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Amount actually received (LKR)")).toHaveValue("100.00");
  await expect(page.getByLabel("Verified transaction / cash receipt reference")).toHaveValue("BANK123");
  await page.screenshot({ path: `test-results/order-review-${test.info().project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("owner settings require verification and preserve receiving details after failure", async ({ page }) => {
  await page.goto("/__commerce-ui");
  await page.evaluate(() => (window as unknown as { showFixture: (name: string) => void }).showFixture("settings"));
  await page.getByLabel("Bank transfers", { exact: true }).check();
  await page.getByLabel("Bank name", { exact: true }).fill("Bank");
  await page.getByLabel("Receiving account name", { exact: true }).fill("Oil Mart");
  const submit = page.getByRole("button", { name: "Save payment methods" });
  await expect(submit).toBeDisabled();
  await page.getByRole("checkbox", { name: /I verified the shop owns/ }).check(); await submit.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Receiving account name")).toHaveValue("Oil Mart");
});

test("live checkout and admin payment routes require authentication", async ({ page }) => {
  for (const [target, login] of [["/en/checkout", /\/en\/login/], ["/admin/orders", /\/admin\/login/], ["/admin/payments", /\/admin\/login/], ["/admin/launch", /\/admin\/login/]] as const) {
    await page.goto(target); await page.waitForURL(login, { timeout: 60000 });
  }
});

test("catalogue batch previews prices and preserves reviewed choices after failure", async ({page})=>{
  await page.goto("/__commerce-ui");
  await page.evaluate(()=>(window as unknown as {showFixture:(name:string)=>void}).showFixture("batch"));
  const submit=page.getByRole("button",{name:"Apply reviewed changes"});
  await expect(submit).toBeDisabled();
  await page.getByRole("checkbox",{name:"Select Test oil 1 litre",exact:true}).check();
  const change=page.getByRole("combobox",{name:"Change",exact:true});
  await change.focus();await change.press("Alt+ArrowDown");await change.press("Escape");
  await page.getByLabel("Discount from each retail price (%)",{exact:false}).fill("10");
  await page.getByLabel("Reason for this change").fill("Owner approved loyalty discount");
  await expect(page.getByLabel("Reason for this change")).toHaveCSS("resize","none");
  await expect(page.getByRole("cell",{name:/90\.00/})).toBeVisible();
  await page.getByRole("checkbox",{name:/I reviewed these products/}).check();
  await submit.click();await expect(page.getByRole("button",{name:"Applying changes…"})).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Connection interrupted");
  await expect(page.getByLabel("Reason for this change")).toHaveValue("Owner approved loyalty discount");
  await expect(page.getByRole("checkbox",{name:"Select Test oil 1 litre",exact:true})).toBeChecked();
  await page.evaluate(()=>{(window as unknown as {fixtureMode:string}).fixtureMode="success";});
  await submit.click();await expect(page.getByRole("link",{name:"Reload setup"})).toBeVisible();
  await expect(submit).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({path:`test-results/commerce-batch-${test.info().project.name}.png`,fullPage:true});
});

test("PayHere checkout retains billing details and requires explicit provider continuation", async ({page})=>{
  await page.goto("/__commerce-ui");
  await page.evaluate(()=>(window as unknown as {showFixture:(name:string)=>void}).showFixture("payhere"));
  const prepare=page.getByRole("button",{name:"Prepare secure payment",exact:true});
  await expect(prepare).toBeDisabled();
  await page.getByLabel("First name",{exact:true}).fill("First");
  await page.getByLabel("Last name",{exact:true}).fill("Last");
  await page.getByLabel("Billing address",{exact:true}).fill("123 Real Street");
  await page.getByLabel("City",{exact:true}).fill("Colombo");
  await page.getByRole("checkbox").check();
  await prepare.click();
  await expect(page.getByRole("button",{name:"Preparing secure payment…"})).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Connection interrupted");
  await expect(page.getByLabel("Billing address",{exact:true})).toHaveValue("123 Real Street");
  await page.evaluate(()=>{(window as unknown as {fixtureMode:string}).fixtureMode="success";});
  await prepare.click();
  await expect(page.getByRole("status")).toContainText("Sandbox test payment");
  const providerForm=page.locator('form[action="https://sandbox.payhere.lk/pay/checkout"]');
  await expect(providerForm).toHaveAttribute("method","post");
  await expect(providerForm.locator('input[name="amount"]')).toHaveValue("100.00");
  await expect(providerForm.locator('input[name="hash"]')).toHaveValue("test-only-hash");
  await expect(providerForm.locator('input[name="merchant_secret"]')).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/__commerce-ui");
  let submitted=false;
  await page.route("https://sandbox.payhere.lk/pay/checkout",async route=>{
    submitted=true;expect(route.request().method()).toBe("POST");
    expect(new URLSearchParams(route.request().postData()??"").get("amount")).toBe("100.00");
    await route.fulfill({contentType:"text/html",body:"<p>Intercepted isolated provider request. No payment made.</p>"});
  });
  await page.getByRole("button",{name:"Continue to PayHere",exact:true}).click();
  await expect(page.getByText("Intercepted isolated provider request. No payment made.")).toBeVisible();
  expect(submitted).toBe(true);
});
