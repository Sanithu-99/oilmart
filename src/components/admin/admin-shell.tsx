import Link from "next/link";
import { Activity, BadgeCheck, BadgePercent, Boxes, ChevronRight, ClipboardList, Droplets, FileSearch, FolderTree, Gauge, ImageIcon, Menu, PackageSearch, Search, Tags, X } from "lucide-react";

import type { AwaitedAdminActor } from "@/components/admin/types";
import { LogoutButton } from "@/components/admin/logout-button";

const navigation = [
  ["Overview", "/admin", Gauge, "admin.dashboard.read"], ["Products", "/admin/products", PackageSearch, "catalog.read"], ["Categories", "/admin/categories", FolderTree, "catalog.write"],
  ["Source data", "/admin/source-data", FileSearch, "catalog.read"],
  ["Brands", "/admin/brands", Tags, "catalog.write"], ["Inventory", "/admin/inventory", Boxes, "inventory.read"], ["Promotions", "/admin/promotions", BadgePercent, "promotions.manage"],
  ["Homepage", "/admin/content", ImageIcon, "content.manage"], ["Audit log", "/admin/audit", ClipboardList, "audit.read"],
  ["Loyalty", "/admin/loyalty", BadgeCheck, "loyalty.manage"],
] as const;

export function AdminShell({ actor, children }: { actor: AwaitedAdminActor; children: React.ReactNode }) {
  return <div className="admin-shell">
    <aside className="admin-sidebar"><Link className="admin-brand" href="/admin"><span><Droplets size={22}/></span><div><strong>Saranankara</strong><small>Oil Mart</small></div></Link><nav aria-label="Admin navigation">{navigation.filter(([, , , permission]) => actor.permissions.has(permission)).map(([label, href, Icon]) => <Link key={href} href={href}><Icon size={18}/><span>{label}</span><ChevronRight className="admin-nav-chevron" size={14}/></Link>)}</nav><div className="admin-system-status"><Activity size={16}/><div><strong>Storefront live</strong><small>Database connected</small></div></div></aside>
    <section className="admin-workspace"><header className="admin-topbar"><details className="admin-mobile-menu"><summary aria-label="Open navigation"><Menu size={20}/></summary><div><span className="admin-mobile-menu-title">Navigation <X size={16}/></span>{navigation.filter(([, , , permission]) => actor.permissions.has(permission)).map(([label, href, Icon]) => <Link key={href} href={href}><Icon size={17}/>{label}</Link>)}</div></details>{actor.permissions.has("catalog.read") && <form className="admin-global-search" action="/admin/products"><Search size={17}/><input name="q" placeholder="Search products, SKU or brand…" aria-label="Search catalogue"/></form>}<div className="admin-user"><span>{actor.name.slice(0, 1).toUpperCase()}</span><div><strong>{actor.name}</strong><small>{actor.roles.join(" · ")}</small></div><LogoutButton/></div></header><main className="admin-main">{children}</main></section>
  </div>;
}
