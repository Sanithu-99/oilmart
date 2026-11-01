import { AuthShell } from "@/components/customer/auth-shell";
import { RegistrationForm } from "@/components/customer/auth-forms";
import { requireLocale } from "@/lib/i18n/config";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const locale = requireLocale((await params).locale); return <AuthShell locale={locale} eyebrow="Create an account" title="Your oils, orders & rewards" intro="Checkout still works without an account. Register to keep your order history and apply for loyalty pricing." alternate={{ label: "Already registered?", href: `/${locale}/login` }}><RegistrationForm locale={locale}/></AuthShell>; }
