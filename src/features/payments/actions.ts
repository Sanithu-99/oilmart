"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/auth/authorization";
import { writeAudit } from "@/features/admin/audit";
import { db } from "@/lib/db/client";
import { paymentSettingsSchema } from "./settings";
import type { OrderActionState } from "@/features/orders/actions";

export async function savePaymentSettingsAction(_state: OrderActionState, form: FormData): Promise<OrderActionState> {
  try {
    const actor = await requireAdmin("settings.manage");
    const parsed = paymentSettingsSchema.safeParse({ ...Object.fromEntries(form), ...Object.fromEntries(["cashEnabled", "bankEnabled", "phoneEnabled", "hostedEnabled"].map((key) => [key, form.get(key) === "on"])) });
    if (!parsed.success) return { error: parsed.error.issues.map((issue) => issue.message).join(" ") };
    if (form.get("verified") !== "on") return { error: "Confirm the receiving details are owned and verified by the shop." };
    await db.$transaction(async (tx) => {
      const where = { key_locale: { key: "commerce.payments", locale: "EN" as const } };
      const before = await tx.storeSetting.findUnique({ where });
      if (before && before.updatedAt.toISOString() !== form.get("updatedAt")) throw new Error("stale");
      if (!before && form.get("updatedAt")) throw new Error("stale");
      const after = await tx.storeSetting.upsert({ where, create: { key: "commerce.payments", locale: "EN", value: parsed.data, public: false }, update: { value: parsed.data, public: false } });
      await writeAudit(tx, actor, { action: "PAYMENT_SETTINGS_UPDATED", entityType: "StoreSetting", entityId: after.id, before, after });
    }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
    revalidatePath("/admin/payments");
    for (const locale of ["en", "si", "ta"]) revalidatePath(`/${locale}`, "layout");
    return { message: "Payment settings saved." };
  } catch { return { error: "Settings changed or could not be saved. Check your access, reload and retry." }; }
}
