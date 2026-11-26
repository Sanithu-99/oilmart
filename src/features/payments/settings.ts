import "server-only";
import { z } from "zod";
import { db } from "@/lib/db/client";
import type { CheckoutMethod } from "@/features/orders/rules";

export const paymentSettingsSchema = z.object({
  cashEnabled: z.boolean().default(true), bankEnabled: z.boolean().default(false), phoneEnabled: z.boolean().default(false), hostedEnabled: z.boolean().default(false),
  bankName: z.string().trim().max(120).default(""), accountName: z.string().trim().max(120).default(""), accountNumber: z.string().trim().max(80).default(""), branch: z.string().trim().max(120).default(""),
  receivingPhone: z.string().trim().max(25).default(""), phoneAccountName: z.string().trim().max(120).default(""),
  hostedName: z.string().trim().max(80).default(""), hostedHost: z.string().trim().toLowerCase().max(200).default(""), instructions: z.string().trim().max(1000).default(""),
}).superRefine((value, ctx) => {
  if (value.bankEnabled && (!value.bankName || !value.accountName || !value.accountNumber)) ctx.addIssue({ code: "custom", message: "Bank payments need the bank, account name and account number." });
  if (value.phoneEnabled && (!/^(?:\+94|0)7\d{8}$/.test(value.receivingPhone) || !value.phoneAccountName)) ctx.addIssue({ code: "custom", message: "Phone transfer needs a verified receiving number and account name." });
  if (value.hostedEnabled && (!value.hostedName || !/^(?=.{4,200}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(value.hostedHost) || /(?:^|\.)(localhost|local|internal|test)$/.test(value.hostedHost))) ctx.addIssue({ code: "custom", message: "Hosted payments need the real merchant provider and checkout domain." });
});
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;
export async function getPaymentSettings() {
  const row = await db.storeSetting.findUnique({ where: { key_locale: { key: "commerce.payments", locale: "EN" } } });
  return paymentSettingsSchema.parse(row?.value ?? {});
}
export function enabledPaymentMethods(settings: PaymentSettings): CheckoutMethod[] {
  return ([settings.cashEnabled && "CASH", settings.bankEnabled && "BANK", settings.phoneEnabled && "PHONE", settings.hostedEnabled && "HOSTED"] as const).filter((value): value is CheckoutMethod => Boolean(value));
}
