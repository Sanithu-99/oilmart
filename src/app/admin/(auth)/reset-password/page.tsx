import { ResetPasswordForm } from "@/components/admin/password-reset-forms";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <main className="admin-auth-page"><section className="admin-auth-card"><p className="admin-eyebrow">One-time reset</p><h1>Choose a new password.</h1><p className="admin-auth-intro">This link expires after 30 minutes and can only be used once.</p><ResetPasswordForm token={token}/></section></main>;
}
