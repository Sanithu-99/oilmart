"use client";

import { useActionState } from "react";
import Link from "next/link";

import { requestAdminPasswordResetAction, resetAdminPasswordAction } from "@/features/admin/auth/password-reset-actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestAdminPasswordResetAction, { sent: false });
  if (state.sent) return <div className="admin-auth-message"><strong>Check your email</strong><p>If that address has admin access, a one-time reset link has been requested.</p><Link href="/admin/login">Return to sign in</Link></div>;
  return <form action={action} className="admin-auth-form"><label>Email address<input name="email" type="email" autoComplete="email" required /></label><button className="admin-primary-button" disabled={pending}>{pending ? "Requesting…" : "Request reset link"}</button></form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetAdminPasswordAction, { complete: false });
  if (state.complete) return <div className="admin-auth-message"><strong>Password updated</strong><p>Your one-time link has been consumed. You can now sign in.</p><Link href="/admin/login">Continue to sign in</Link></div>;
  return <form action={action} className="admin-auth-form"><input type="hidden" name="token" value={token}/><label>New password<input name="password" type="password" autoComplete="new-password" minLength={14} required /></label><p className="admin-field-hint">Use at least 14 characters. A unique passphrase works well.</p>{state.error && <p className="admin-form-error" role="alert">{state.error}</p>}<button className="admin-primary-button" disabled={pending}>{pending ? "Updating…" : "Set new password"}</button></form>;
}
