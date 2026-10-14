import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { requireFarmAccess, requirePlotAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { reminderUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [row] = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
    if (!row) return jsonError("Pengingat tidak ditemukan.", 404);
    await requireFarmAccess(user.id, row.farmId);
    const body = await parseBody(request, reminderUpdateSchema);
    if (body.plotId) await requirePlotAccess(user.id, body.plotId);
    const [updated] = await db
      .update(reminders)
      .set({
        plotId: body.plotId,
        title: body.title,
        dueDate: body.dueDate,
        status: body.status,
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(eq(reminders.id, id))
      .returning();
    return jsonOk(updated);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [row] = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
    if (!row) return jsonError("Pengingat tidak ditemukan.", 404);
    await requireFarmAccess(user.id, row.farmId);
    const url = new URL(request.url);
    if (url.searchParams.get("confirm") !== "true") {
      return jsonError("Penghapusan perlu konfirmasi.", 400);
    }
    await db.delete(reminders).where(eq(reminders.id, id));
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
