import { AuthShell } from "@/components/customer/auth-shell";
import { ForgotPasswordForm } from "@/components/customer/auth-forms";
import { requireLocale } from "@/lib/i18n/config";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const locale = requireLocale((await params).locale); return <AuthShell locale={locale} eyebrow="Account recovery" title="Reset your password" intro="Enter your account email. For privacy, the response is the same whether or not an account exists."><ForgotPasswordForm locale={locale}/></AuthShell>; }
