"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return <form className="admin-auth-form" onSubmit={async (event) => {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirect: false });
    setPending(false);
    if (result?.error) { setError("Email or password is incorrect. Please try again."); return; }
    router.push(search.get("next")?.startsWith("/admin") ? search.get("next")! : "/admin"); router.refresh();
  }}>
    <label>Email address<input name="email" type="email" autoComplete="username" required /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <p className="admin-form-error" role="alert">{error}</p>}
    <button className="admin-primary-button" disabled={pending}>{pending ? "Signing in…" : "Sign in securely"}</button>
  </form>;
}
