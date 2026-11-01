import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ForgotPasswordForm } from "@/components/admin/password-reset-forms";

export default function ForgotPasswordPage() {
  return <main className="admin-auth-page"><section className="admin-auth-card"><Link href="/admin/login" className="admin-back-link"><ArrowLeft size={15}/> Back to sign in</Link><p className="admin-eyebrow">Account recovery</p><h1>Reset your password.</h1><p className="admin-auth-intro">Enter your admin email. For security, the response is the same whether the account exists or not.</p><ForgotPasswordForm/></section></main>;
}
