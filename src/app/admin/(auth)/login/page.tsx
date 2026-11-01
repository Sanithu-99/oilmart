import Link from "next/link";
import { Droplets } from "lucide-react";

import { LoginForm } from "@/components/admin/login-form";

export default function AdminLoginPage() {
  return <main className="admin-auth-page"><section className="admin-auth-card"><div className="admin-auth-brand"><span><Droplets size={25}/></span><div><strong>Saranankara</strong><small>Oil Mart · Administration</small></div></div><p className="admin-eyebrow">Protected workspace</p><h1>Welcome back.</h1><p className="admin-auth-intro">Sign in to manage the catalogue, pricing, stock and storefront content.</p><LoginForm/><div className="admin-auth-links"><Link href="/admin/forgot-password">Forgot password?</Link><Link href="/en">Return to storefront</Link></div></section></main>;
}
