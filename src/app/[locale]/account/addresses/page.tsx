import { Trash2 } from "lucide-react";

import { AddressForm } from "@/components/customer/account-forms";
import { deleteAddressAction } from "@/features/customer/account/actions";
import { requireCustomerPage } from "@/features/customer/auth/authorization";
import { db } from "@/lib/db/client";
import { requireLocale } from "@/lib/i18n/config";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const locale = requireLocale((await params).locale); const customer = await requireCustomerPage(locale); const addresses = await db.address.findMany({ where: { customerId: customer.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }); return <><section className="account-panel"><div className="panel-heading"><div><p className="eyebrow">Delivery details</p><h2>Saved addresses</h2></div><span>{addresses.length} saved</span></div><div className="address-list">{addresses.map((address) => <article key={address.id}><div><strong>{address.label || address.type}</strong>{address.isDefault && <span>Default</span>}<p>{address.recipient}<br/>{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br/>{address.city}{address.postalCode ? ` ${address.postalCode}` : ""}<br/>{address.phone}</p></div><details><summary>Edit</summary><AddressForm address={address}/></details><form noValidate action={deleteAddressAction}><input type="hidden" name="id" value={address.id}/><button aria-label={`Delete ${address.label ?? "address"}`}><Trash2 size={16}/></button></form></article>)}</div></section><section className="account-panel"><div className="panel-heading"><div><p className="eyebrow">New destination</p><h2>Add an address</h2></div></div><AddressForm/></section></>; }
