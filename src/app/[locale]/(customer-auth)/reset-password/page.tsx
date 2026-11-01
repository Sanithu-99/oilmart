import { AuthShell } from "@/components/customer/auth-shell";
import { ResetPasswordForm } from "@/components/customer/auth-forms";
import { requireLocale } from "@/lib/i18n/config";

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ email?: string; token?: string }> }) { const locale = requireLocale((await params).locale); const search = await searchParams; return <AuthShell locale={locale} eyebrow="Account recovery" title="Choose a new password" intro="Reset links expire after 30 minutes and can only be used once."><ResetPasswordForm email={search.email ?? ""} token={search.token ?? ""}/></AuthShell>; }
