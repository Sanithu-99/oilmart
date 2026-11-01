import type { requireAdminPage } from "@/features/admin/auth/authorization";

export type AwaitedAdminActor = Awaited<ReturnType<typeof requireAdminPage>>;
