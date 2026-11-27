import { revalidatePath } from "next/cache";
import { processPayHereNotification } from "@/features/payments/payhere-notification";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return new Response("Unsupported notification format.", { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) return new Response("Missing notification.", { status: 400 });
  try {
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > 16384) { await reader.cancel(); return new Response("Notification is too large.", { status: 413 }); }
      chunks.push(next.value);
    }
    const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
    if ([...form.keys()].some(key => form.getAll(key).length !== 1)) return new Response("Duplicate notification fields.", { status: 400 });
    const result = await processPayHereNotification(Object.fromEntries(form));
    if (result.status === 200) {
      revalidatePath("/admin/orders"); revalidatePath("/admin/inventory");
      for (const locale of ["en", "si", "ta"]) revalidatePath(`/${locale}`, "layout");
    }
    return new Response(result.message, { status: result.status, headers: { "cache-control": "no-store" } });
  } catch {
    // No acknowledgement on rollback: the provider can retry. Never log raw card/provider payloads.
    return new Response("Could not record notification. Retry later.", { status: 503 });
  } finally { reader.releaseLock(); }
}
