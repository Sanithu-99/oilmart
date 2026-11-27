import { BadgeCheck, Clock3, Gift, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { LoyaltyApplicationForm } from "@/components/customer/loyalty-application-form";
import { requireCustomerPage } from "@/features/customer/auth/authorization";
import { loyaltyContactsVerified } from "@/features/customer/loyalty/eligibility";
import { db } from "@/lib/db/client";
import { requireLocale } from "@/lib/i18n/config";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const locale = requireLocale((await params).locale);
  const customer = await requireCustomerPage(locale);
  const verified = loyaltyContactsVerified(customer.user);
  const membership = customer.loyaltyMembership ? await db.loyaltyMembership.findUnique({ where: { id: customer.loyaltyMembership.id }, include: { decisions: { orderBy: { createdAt: "desc" }, take: 8 } } }) : null;
  return <section className="account-panel loyalty-panel">
    <div className="panel-heading"><div><p className="eyebrow">Saranankara loyalty</p><h2>{membership ? membership.status.replaceAll("_", " ") : "Apply for membership"}</h2></div>{membership?.memberNumber && <span className="member-number">{membership.memberNumber}</span>}</div>
    <div className="loyalty-benefits"><div><Gift/><strong>Member pricing</strong><span>Eligible products show your best active price.</span></div><div><ShieldCheck/><strong>Verified account</strong><span>Email and mobile verification are required for loyalty pricing.</span></div><div><BadgeCheck/><strong>Clear decisions</strong><span>Application history remains visible and auditable.</span></div></div>
    {!verified && <div className="loyalty-state"><ShieldCheck/><div><strong>Verify your mobile before continuing</strong><p>Your membership record is retained. Loyalty applications, activation and member pricing require a verified email and mobile number.</p><Link className="button-secondary" href={`/${locale}/account/security`}>Verify mobile number by SMS</Link></div></div>}
    {!membership || ["REJECTED", "EXPIRED"].includes(membership.status) ? verified && <LoyaltyApplicationForm/> : <div className={`loyalty-state ${membership.status.toLowerCase()}`}><Clock3/><div><strong>Application {membership.status.toLowerCase()}</strong><p>{membership.notes ?? (membership.status === "PENDING" ? "The store team will review your verified account." : "Your membership status is shown above.")}</p></div></div>}
    {membership?.decisions.length ? <div className="decision-history"><h3>Decision history</h3>{membership.decisions.map((event) => <p key={event.id}><strong>{event.toStatus}</strong><span>{event.createdAt.toLocaleString("en-LK")}</span>{event.notes && <small>{event.notes}</small>}</p>)}</div> : null}
  </section>;
}
