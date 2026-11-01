import Link from "next/link";
import { BadgeCheck, Clock3, MapPin } from "lucide-react";

import { ProfileForm } from "@/components/customer/account-forms";
import { requireCustomerPage } from "@/features/customer/auth/authorization";
import { db } from "@/lib/db/client";
import { requireLocale } from "@/lib/i18n/config";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const locale = requireLocale((await params).locale); const customer = await requireCustomerPage(locale); const [orders, addresses] = await Promise.all([db.order.count({ where: { customerId: customer.id } }), db.address.count({ where: { customerId: customer.id } })]); return <><div className="account-summary-grid"><Link href={`/${locale}/account/orders`}><Clock3/><strong>{orders}</strong><span>Orders</span></Link><Link href={`/${locale}/account/addresses`}><MapPin/><strong>{addresses}</strong><span>Saved addresses</span></Link><Link href={`/${locale}/account/loyalty`}><BadgeCheck/><strong>{customer.loyaltyMembership?.status ?? "Not enrolled"}</strong><span>Loyalty status</span></Link></div><section className="account-panel"><div className="panel-heading"><div><p className="eyebrow">Account overview</p><h2>Profile details</h2></div><span className="verified-chip">{customer.user.emailVerified ? "Email verified" : "Verification needed"}</span></div><ProfileForm customer={{ firstName: customer.firstName, lastName: customer.lastName, locale: customer.locale }}/></section></>; }
