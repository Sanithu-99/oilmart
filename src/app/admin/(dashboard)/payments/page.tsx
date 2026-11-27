import { PaymentSettingsForm } from "@/components/admin/payment-settings";
import { requireAdminPage } from "@/features/admin/auth/authorization";
import { getPaymentSettings } from "@/features/payments/settings";
import { db } from "@/lib/db/client";
import { getEnv } from "@/lib/env";

export default async function PaymentsPage() {
  await requireAdminPage("settings.manage");
  const [settings, row] = await Promise.all([getPaymentSettings(), db.storeSetting.findUnique({ where: { key_locale: { key: "commerce.payments", locale: "EN" } } })]);
  const env = getEnv();
  const payhereHost = env.PAYHERE_MODE === "live" ? "www.payhere.lk" : "sandbox.payhere.lk";
  const payhereConfigured = Boolean(env.PAYHERE_MERCHANT_ID && env.PAYHERE_MERCHANT_SECRET);
  return <>
    <header className="admin-page-heading"><div><p className="admin-eyebrow">Owner settings</p><h1>Payment methods</h1><p>Configure verified receiving details. Payment instructions are shown only after the shop confirms an order.</p></div></header>
    <section className="admin-panel"><PaymentSettingsForm key={row?.updatedAt.toISOString() ?? "new"} settings={settings} updatedAt={row?.updatedAt.toISOString() ?? ""}/></section>
    <section className="admin-panel mt-6"><h2>Automatic gateway checkout</h2>
      <p>{payhereConfigured ? `PayHere ${env.PAYHERE_MODE ?? "sandbox"} credentials configured.` : "PayHere is implemented but merchant credentials have not been configured."}</p>
      <p className="mt-3">For automatic PayHere checkout, enable hosted payments above and set the checkout hostname to <strong>{payhereHost}</strong>. Use sandbox credentials before enabling real payments. The deployed site must accept payment notifications at <code>/api/payments/payhere/notify</code>.</p>
      <p className="mt-3">Orders still require shop stock confirmation. The signed provider notification verifies the exact payment and updates the order; returning to the website alone cannot mark an order paid.</p>
      <p className="mt-3 text-sm">Genie and other providers can continue using their approved merchant links. The 4% card estimate is not collected by automatic checkout. Confirm the permitted merchant pricing policy before changing live card prices.</p>
    </section>
    <section className="admin-panel mt-6"><h2>Phone SMS connection</h2><p>{env.SMS_PROVIDER === "sms-gate" && env.SMS_GATE_URL && env.SMS_GATE_TOKEN && env.SMS_GATE_DEVICE_ID ? "SMS gateway credentials configured; verify the device is online before launch." : "No live phone gateway configured. OTPs will not be reported as sent."}</p><p className="mt-3 text-sm">Connect the Android phone through a private SMSGate endpoint and server-side credentials. Keep tokens out of the dashboard and confirm the SIM plan permits automated transactional messages. See docs/operations/payments-and-sms.md.</p></section>
    <section className="admin-panel mt-6"><h2>Customer email connection</h2><p>{env.EMAIL_PROVIDER === "resend" && env.RESEND_API_KEY && env.EMAIL_FROM ? "Email delivery configured. Verify the sender domain and test account verification before launch." : "No live email provider configured. Add the Resend API key and a verified sender in the server environment to deliver registration and recovery links."}</p></section>
  </>;
}
