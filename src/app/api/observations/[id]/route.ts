import { eq } from "drizzle-orm";
import { db } from "@/db";
import { observations } from "@/db/schema";
import { requirePlotAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { observationUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [row] = await db.select().from(observations).where(eq(observations.id, id)).limit(1);
    if (!row) return jsonError("Observasi tidak ditemukan.", 404);
    await requirePlotAccess(user.id, row.plotId);
    const body = await parseBody(request, observationUpdateSchema);
    const [updated] = await db
      .update(observations)
      .set({
        plantingId: body.plantingId,
        category: body.category,
        observedAt: body.observedAt,
        description: body.description,
      })
      .where(eq(observations.id, id))
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
    const [row] = await db.select().from(observations).where(eq(observations.id, id)).limit(1);
    if (!row) return jsonError("Observasi tidak ditemukan.", 404);
    await requirePlotAccess(user.id, row.plotId);
    const url = new URL(request.url);
    if (url.searchParams.get("confirm") !== "true") {
      return jsonError("Penghapusan perlu konfirmasi.", 400);
    }
    await db.delete(observations).where(eq(observations.id, id));
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
