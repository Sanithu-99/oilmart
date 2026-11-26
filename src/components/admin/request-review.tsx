"use client";

import { useActionState, useState } from "react";
import { reviewRequestAction, type RequestState } from "@/features/requests/actions";

export function RequestReview({ id, kind, updatedAt, fee, notes }: { id: string; kind: "quote" | "preorder"; updatedAt: string; fee: string; notes: string }) {
  const [state, action, pending] = useActionState(reviewRequestAction, {} as RequestState);
  const [feeValue, setFee] = useState(fee);
  const [noteValue, setNotes] = useState(notes);
  const [decision, setDecision] = useState(kind === "quote" ? "PREPARED" : "APPROVED");
  return <form action={action} noValidate className="request-form mt-4">
    <input name="id" value={id} type="hidden"/><input name="kind" value={kind} type="hidden"/><input name="updatedAt" value={updatedAt} type="hidden"/>
    {kind === "quote" && <label>Quotation fee for this vehicle / customer (LKR)<input name="fee" value={feeValue} onChange={(event) => setFee(event.target.value)} inputMode="decimal" required/><small>Set the amount individually. This records the fee; it does not collect payment.</small></label>}
    <label>Review note / terms shown to the customer<textarea name="notes" value={noteValue} onChange={(event) => setNotes(event.target.value)} rows={3} required minLength={3} maxLength={2000} className="resize-none"/></label>
    <label>Decision<select name="decision" value={decision} onChange={(event) => setDecision(event.target.value)}><option value={kind === "quote" ? "PREPARED" : "APPROVED"}>{kind === "quote" ? "Set fee and prepare quotation" : "Approve pre-order request"}</option><option value="REJECTED">Reject request</option></select></label>
    <button className="admin-primary-button" disabled={pending}>{pending ? "Saving…" : "Save review"}</button>
    {state.error && <p role="alert" className="request-error">{state.error}</p>}{state.reference && <p role="status">{state.reference}</p>}
  </form>;
}
