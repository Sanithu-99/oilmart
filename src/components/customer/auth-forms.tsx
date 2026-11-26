"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { registerCustomerAction, requestPasswordResetAction, resendVerificationAction, resetCustomerPasswordAction, verifyEmailAction, type AuthFormState } from "@/features/customer/auth/actions";
import type { StoreLocale } from "@/lib/i18n/config";

const initial: AuthFormState = {};

function Feedback({ state }: { state: AuthFormState }) {
  if (!state.message) return null;
  return <div className={`customer-feedback ${state.ok ? "success" : "error"}`} role="status"><p>{state.message}</p>{state.previewUrl && <Link href={state.previewUrl}>Open development preview link</Link>}</div>;
}

export function CustomerLoginForm({ locale }: { locale: StoreLocale }) {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return <form noValidate className="customer-form" onSubmit={async (event) => {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    const result = await signIn("customer-credentials", { email: data.get("email"), password: data.get("password"), redirect: false });
    if (result?.error) { setPending(false); setError("Email or password is incorrect, or the email has not been verified."); return; }
    let merge = await fetch("/api/customer/cart/merge", { method: "POST" });
    if (merge.status === 401) {
      await new Promise((resolve) => setTimeout(resolve, 75));
      merge = await fetch("/api/customer/cart/merge", { method: "POST" });
    }
    if (!merge.ok) { setPending(false); setError("Signed in, but the guest cart could not be merged. Reload and try again."); return; }
    const next = search.get("next");
    router.push(next?.startsWith(`/${locale}/`) ? next : `/${locale}/account`); router.refresh();
  }}>
    <label>Email address<input name="email" type="email" autoComplete="email" required/></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button-primary justify-center" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    <div className="customer-form-links"><Link href={`/${locale}/forgot-password`}>Forgot password?</Link><Link href={`/${locale}/verify-email`}>Resend verification</Link></div>
  </form>;
}

export function RegistrationForm({ locale }: { locale: StoreLocale }) {
  const [state, action, pending] = useActionState(registerCustomerAction, initial);
  return <form noValidate className="customer-form" action={action}>
    <input type="hidden" name="locale" value={locale}/>
    <div className="customer-form-grid"><label>First name<input name="firstName" autoComplete="given-name" required/></label><label>Last name<input name="lastName" autoComplete="family-name" required/></label></div>
    <label>Email address<input name="email" type="email" autoComplete="email" required/></label>
    <label>Password<input name="password" type="password" autoComplete="new-password" minLength={10} required/><small>10+ characters with upper/lowercase letters and a number.</small></label>
    <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required/></label>
    <label className="check-row"><input name="terms" type="checkbox" required/><span>I agree to the <Link href={`/${locale}/terms`}>Terms</Link> and <Link href={`/${locale}/privacy`}>Privacy Policy</Link>.</span></label>
    <label className="check-row"><input name="emailMarketing" type="checkbox"/><span>Email me occasional offers (optional).</span></label>
    <label className="check-row"><input name="smsMarketing" type="checkbox"/><span>Send me occasional SMS offers (optional).</span></label>
    <Feedback state={state}/><button className="button-primary justify-center" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
  </form>;
}

export function ForgotPasswordForm({ locale }: { locale: StoreLocale }) {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);
  return <form noValidate className="customer-form" action={action}><input type="hidden" name="locale" value={locale}/><label>Email address<input name="email" type="email" autoComplete="email" required/></label><Feedback state={state}/><button className="button-primary justify-center" disabled={pending}>{pending ? "Preparing…" : "Request reset link"}</button></form>;
}

export function ResetPasswordForm({ email, token }: { email: string; token: string }) {
  const [state, action, pending] = useActionState(resetCustomerPasswordAction, initial);
  return <form noValidate className="customer-form" action={action}><input type="hidden" name="email" value={email}/><input type="hidden" name="token" value={token}/><label>New password<input name="password" type="password" autoComplete="new-password" minLength={10} required/></label><label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required/></label><Feedback state={state}/><button className="button-primary justify-center" disabled={pending}>{pending ? "Updating…" : "Update password"}</button></form>;
}

export function VerifyEmailForm({ locale, email, token }: { locale: StoreLocale; email: string; token: string }) {
  const [state, action, pending] = useActionState(verifyEmailAction, initial);
  return <form noValidate className="customer-form" action={action}><input type="hidden" name="email" value={email}/><input type="hidden" name="token" value={token}/><Feedback state={state}/><button className="button-primary justify-center" disabled={!email || !token || pending}>{pending ? "Verifying…" : "Verify email"}</button>{state.ok && <Link className="button-secondary justify-center" href={`/${locale}/login`}>Continue to sign in</Link>}</form>;
}

export function ResendVerificationForm({ locale }: { locale: StoreLocale }) {
  const [state, action, pending] = useActionState(resendVerificationAction, initial);
  return <form noValidate className="customer-form" action={action}><input type="hidden" name="locale" value={locale}/><label>Email address<input name="email" type="email" required/></label><Feedback state={state}/><button className="button-secondary justify-center" disabled={pending}>{pending ? "Preparing…" : "Resend verification link"}</button></form>;
}
