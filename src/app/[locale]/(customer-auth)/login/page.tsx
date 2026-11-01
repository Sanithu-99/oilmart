import { AuthShell } from "@/components/customer/auth-shell";
import { CustomerLoginForm } from "@/components/customer/auth-forms";
import { requireLocale } from "@/lib/i18n/config";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const locale = requireLocale((await params).locale); return <AuthShell locale={locale} eyebrow="Customer account" title="Welcome back" intro="Sign in to view orders, saved addresses and your loyalty status." alternate={{ label: "New to Saranankara Oil Mart?", href: `/${locale}/register` }}><CustomerLoginForm locale={locale}/></AuthShell>; }
