import { AuthShell } from "@/components/customer/auth-shell";
import { ResendVerificationForm, VerifyEmailForm } from "@/components/customer/auth-forms";
import { requireLocale } from "@/lib/i18n/config";

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ email?: string; token?: string }> }) { const locale = requireLocale((await params).locale); const search = await searchParams; return <AuthShell locale={locale} eyebrow="Verify your account" title="Confirm your email" intro="Verification protects your order history and is required before customer sign-in.">{search.email && search.token ? <VerifyEmailForm locale={locale} email={search.email} token={search.token}/> : <ResendVerificationForm locale={locale}/>}</AuthShell>; }
