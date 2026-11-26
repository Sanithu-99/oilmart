"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { checkoutAction, reportPaymentAction, type OrderActionState } from "@/features/orders/actions";
import { checkoutCopy } from "@/lib/i18n/checkout";
import type { CheckoutMethod } from "@/features/orders/rules";

export function CheckoutForm({ source, sourceId, total, locale, methods, sourceVersion = "", fingerprint = "" }: { source: "cart" | "preorder" | "quotation"; sourceId: string; total: string; locale: string; methods: CheckoutMethod[]; sourceVersion?: string; fingerprint?: string }) {
  const [state, action, pending] = useActionState(checkoutAction, {} as OrderActionState);
  const [method, setMethod] = useState<string>(methods[0] ?? "");
  const [accepted, setAccepted] = useState(false);
  const copy = checkoutCopy(locale);
  if (state.orderId) return <div role="status"><p>{copy.notice}</p><Link className="button-primary mt-4" href={`/${locale}/account/orders/${state.orderId}`}>{copy.viewOrder}</Link></div>;
  if (!methods.length) return <p>{copy.noMethods}</p>;
  return <form noValidate onReset={(event) => event.preventDefault()} action={action} className="request-form">
    <input type="hidden" name="source" value={source}/><input type="hidden" name="sourceId" value={sourceId}/><input type="hidden" name="expectedTotal" value={total}/><input type="hidden" name="locale" value={locale}/>
    <input type="hidden" name="sourceVersion" value={sourceVersion}/><input type="hidden" name="fingerprint" value={fingerprint}/>
    <p>{source === "quotation" ? copy.feeNote : copy.notice}</p>
    <label>{copy.method}<select name="method" value={method} onChange={(event) => setMethod(event.target.value)}>{methods.map((value) => <option key={value} value={value}>{copy[value]}</option>)}</select></label>
    <label className="request-consent"><input type="checkbox" name="accepted" checked={accepted} onChange={(event) => setAccepted(event.target.checked)}/><span>{copy.accept}</span></label>
    <button className="button-primary" disabled={pending || !accepted} aria-busy={pending}>{pending ? copy.waiting : copy.continue}</button>
    {state.error && <p role="alert" className="request-error">{state.error}</p>}
  </form>;
}

export function ReportPaymentForm({ orderId, updatedAt, locale }: { orderId: string; updatedAt: string; locale: string }) {
  const [state, action, pending] = useActionState(reportPaymentAction, {} as OrderActionState);
  const [reference, setReference] = useState("");
  const [accepted, setAccepted] = useState(false);
  const copy = checkoutCopy(locale);
  return <form noValidate onReset={(event) => event.preventDefault()} action={action} className="request-form mt-6"><input type="hidden" name="orderId" value={orderId}/><input type="hidden" name="updatedAt" value={updatedAt}/><label>{copy.reference}<input name="reference" value={reference} onChange={(event) => setReference(event.target.value)} minLength={3} maxLength={160} aria-describedby="payment-reference-help"/></label><p id="payment-reference-help" className="text-sm">{copy.verifyNote}</p><label className="request-consent"><input type="checkbox" name="accepted" checked={accepted} onChange={(event) => setAccepted(event.target.checked)}/><span>{copy.referenceAccept}</span></label><button className="button-primary" disabled={pending || !accepted || reference.trim().length < 3}>{pending ? copy.waiting : copy.report}</button>{state.error && <p role="alert" className="request-error">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}</form>;
}
