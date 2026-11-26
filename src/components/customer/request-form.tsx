"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { submitRequestAction, type RequestState } from "@/features/requests/actions";
import { commerceCopy } from "@/lib/i18n/commerce";

export function RequestForm({ locale, kind, product, name, phone, requestKey }: {
  requestKey: string; locale: string; kind: "quote" | "preorder"; name: string; phone: string;
  product: { slug: string; name: string; variants: Array<{ id: string; name: string }> } | null;
}) {
  const copy = commerceCopy(locale);
  const [state, action, pending] = useActionState(submitRequestAction, {} as RequestState);
  const [values, setValues] = useState({ name, phone, vehicle: "", notes: "", quantity: "1", variantId: product?.variants[0]?.id ?? "", accepted: false });
  function change(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const target = event.currentTarget;
    setValues((current) => ({ ...current, [target.name]: target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value }));
  }
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error) {
      const field = state.invalidFields?.[0];
      (field ? formRef.current?.elements.namedItem(field) as HTMLElement | null : formRef.current?.querySelector<HTMLElement>("[role=alert]"))?.focus();
    }
  }, [state]);
  if (state.reference) return <div className="detail-panel" role="status"><h2>{copy.received}</h2><p className="mt-3 break-all font-mono text-sm">{state.reference}</p><p className="mt-4">{copy.noCharge}</p></div>;
  const invalid = (field: string) => state.invalidFields?.includes(field) || undefined;
  return <form ref={formRef} action={action} noValidate onReset={(event) => event.preventDefault()} className="request-form detail-panel">
    <input name="locale" value={locale} type="hidden"/><input name="kind" value={kind} type="hidden"/><input name="requestKey" value={requestKey} type="hidden"/><input name="productSlug" value={product?.slug ?? ""} type="hidden"/>
    <p>{kind === "quote" ? copy.quotePolicy : copy.preorderPolicy}</p>
    {state.error && <p id="request-error" role="alert" tabIndex={-1} className="request-error">{state.error}</p>}
    <label>{copy.name}<input name="name" value={values.name} onChange={change} autoComplete="name" required minLength={2} maxLength={120} aria-invalid={invalid("name")} aria-describedby={state.error ? "request-error" : undefined}/></label>
    <label>{copy.phone}<input name="phone" value={values.phone} onChange={change} type="tel" autoComplete="tel" placeholder="0771234567" required aria-invalid={invalid("phone")} aria-describedby="request-phone-help"/><small id="request-phone-help">0771234567 / +94771234567</small></label>
    <label>{copy.vehicle}<input name="vehicle" value={values.vehicle} onChange={change} maxLength={200} aria-invalid={invalid("vehicle")}/></label>
    {product && <p className="font-semibold">{product.name}</p>}
    {product && product.variants.length > 1 ? <label>{copy.sizes}<select name="variantId" value={values.variantId} onChange={change}>{product.variants.map((variant) => <option value={variant.id} key={variant.id}>{variant.name}</option>)}</select></label> : <input name="variantId" type="hidden" value={product?.variants[0]?.id ?? ""}/>}
    <label>{copy.quantity}<input name="quantity" value={values.quantity} onChange={change} inputMode="decimal" aria-invalid={invalid("quantity")} aria-describedby={state.error ? "request-error" : undefined}/></label>
    <label>{copy.notes}<textarea name="notes" value={values.notes} onChange={change} rows={5} minLength={5} maxLength={2000} required className="resize-none" aria-invalid={invalid("notes")} aria-describedby={state.error ? "request-error" : undefined}/></label>
    <label className="request-consent"><input name="accepted" checked={values.accepted} onChange={change} type="checkbox" required aria-invalid={invalid("accepted")} aria-describedby={state.error ? "request-error" : undefined}/><span>{copy.accepted}</span></label>
    <button className="button-primary" disabled={pending} aria-busy={pending}>{pending ? copy.sending : copy.submit}</button>
  </form>;
}
