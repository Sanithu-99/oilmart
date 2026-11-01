import { SecurityForms } from "@/components/customer/account-forms";
import { requireCustomerPage } from "@/features/customer/auth/authorization";
import { requireLocale } from "@/lib/i18n/config";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const locale = requireLocale((await params).locale); const customer = await requireCustomerPage(locale); return <section className="account-panel"><div className="panel-heading"><div><p className="eyebrow">Account protection</p><h2>Security & verification</h2></div><span className="verified-chip">{customer.user.phoneVerifiedAt ? "Phone verified" : "Phone not verified"}</span></div><p className="panel-intro">Sensitive changes require your current password. Verification codes expire after 10 minutes and stop after five failed attempts.</p><SecurityForms phone={customer.user.phone}/></section>; }
