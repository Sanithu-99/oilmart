"use client";

import { useActionState } from "react";
import { applyForLoyaltyFormAction } from "@/features/customer/loyalty/actions";

export function LoyaltyApplicationForm() {
  const [state, action, pending] = useActionState(applyForLoyaltyFormAction, { ok: false, message: "" });
  return <form noValidate action={action}><p>Submit your email- and phone-verified account for shop review. Approval is never automatic.</p>{state.message && <p role="status" className={`inline-status ${state.ok ? "success" : "error"}`}>{state.message}</p>}<button className="button-primary" disabled={pending || state.ok}>{pending ? "Submitting application…" : state.ok ? "Application submitted" : "Submit loyalty application"}</button></form>;
}
