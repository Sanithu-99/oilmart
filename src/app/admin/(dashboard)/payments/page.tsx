import { PaymentSettingsForm } from "@/components/admin/payment-settings";
import { requireAdminPage } from "@/features/admin/auth/authorization";
import { getPaymentSettings } from "@/features/payments/settings";
import { db } from "@/lib/db/client";
import { getEnv } from "@/lib/env";

export default async function PaymentsPage() {
  await requireAdminPage("settings.manage");
  const [settings, row] = await Promise.all([getPaymentSettings(), db.storeSetting.findUnique({ where: { key_locale: { key: "commerce.payments", locale: "EN" } } })]);
  const env = getEnv();
  return <><header className="admin-page-heading"><div><p className="admin-eyebrow">Owner settings</p><h1>Payment methods</h1><p>Configure verified receiving details. Payment instructions are shown only after the shop confirms an order.</p></div></header><section className="admin-panel"><PaymentSettingsForm key={row?.updatedAt.toISOString() ?? "new"} settings={settings} updatedAt={row?.updatedAt.toISOString() ?? ""}/></section><section className="admin-panel mt-6"><h2>Phone SMS connection</h2><p>{env.SMS_PROVIDER === "sms-gate" && env.SMS_GATE_URL && env.SMS_GATE_TOKEN && env.SMS_GATE_DEVICE_ID ? "SMS gateway credentials configured; verify the device is online before launch." : "No live phone gateway configured. OTPs will not be reported as sent."}</p><p className="mt-3 text-sm">Connect the Android phone through a private SMSGate endpoint and server-side credentials. Keep tokens out of the dashboard and confirm the SIM plan permits automated transactional messages. See docs/operations/payments-and-sms.md.</p></section></>;
}
