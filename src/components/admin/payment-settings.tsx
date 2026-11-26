"use client";
import { useActionState, useState } from "react";
import { savePaymentSettingsAction } from "@/features/payments/actions";
import type { PaymentSettings } from "@/features/payments/settings";
import type { OrderActionState } from "@/features/orders/actions";

export function PaymentSettingsForm({ settings, updatedAt }: { settings: PaymentSettings; updatedAt: string }) {
  const [state, action, pending] = useActionState(savePaymentSettingsAction, {} as OrderActionState);
  const [values, setValues] = useState(settings), [verified, setVerified] = useState(false);
  const fields = [["bankName", "Bank name"], ["accountName", "Receiving account name"], ["accountNumber", "Account number"], ["branch", "Bank branch"], ["receivingPhone", "Registered NTB / FriMi receiving number"], ["phoneAccountName", "Phone transfer recipient name"], ["hostedName", "Hosted payment provider (e.g. Dialog Pay Business)"], ["hostedHost", "Provider checkout hostname (no https:// or path)"]] as const;
  return <form noValidate onReset={(event) => event.preventDefault()} action={action} className="request-form"><input name="updatedAt" value={updatedAt} type="hidden"/>
    <div className="grid gap-4 sm:grid-cols-2">{([["cashEnabled", "Cash on pickup"], ["bankEnabled", "Bank transfers"], ["phoneEnabled", "Registered phone transfers"], ["hostedEnabled", "Merchant-hosted payment links"]] as const).map(([key, label]) => <label className="request-consent" key={key}><input type="checkbox" name={key} checked={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.checked }))}/><span>{label}</span></label>)}</div>
    <div className="grid gap-5 sm:grid-cols-2">{fields.map(([key, label]) => <label className="product-size-label" key={key}>{label}<input name={key} value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}/></label>)}</div>
    <label>Customer payment instructions<textarea name="instructions" className="resize-none" rows={4} maxLength={1000} value={values.instructions} onChange={(event) => setValues((current) => ({ ...current, instructions: event.target.value }))}/></label>
    <p className="text-sm">The shop contact number is not assumed to be a payment recipient. Verify the registered receiving account before enabling phone transfers. Hosted links must come from your approved merchant account; the customer card surcharge estimate is not used for hosted charges.</p>
    <label className="request-consent"><input type="checkbox" name="verified" checked={verified} onChange={(event) => setVerified(event.target.checked)}/><span>I verified the shop owns these receiving accounts and the hosted checkout domain.</span></label>
    <button className="admin-primary-button" disabled={pending || !verified}>{pending ? "Saving…" : "Save payment methods"}</button>{state.error && <p role="alert" className="request-error">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}
  </form>;
}
