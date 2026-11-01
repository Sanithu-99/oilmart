import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/features/admin/auth/authorization";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireAdminPage("admin.dashboard.read");
  return <AdminShell actor={actor}>{children}</AdminShell>;
}
