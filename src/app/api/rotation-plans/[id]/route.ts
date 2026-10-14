import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rotationPlans } from "@/db/schema";
import { requirePlotAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { rotationPlanUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [row] = await db.select().from(rotationPlans).where(eq(rotationPlans.id, id)).limit(1);
    if (!row) return jsonError("Rencana rotasi tidak ditemukan.", 404);
    await requirePlotAccess(user.id, row.plotId);
    const body = await parseBody(request, rotationPlanUpdateSchema);
    const [updated] = await db
      .update(rotationPlans)
      .set({
        cropId: body.cropId,
        seasonId: body.seasonId,
        status: body.status,
        startDate: body.startDate,
        endDate: body.endDate,
        reasons: body.reasons,
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(eq(rotationPlans.id, id))
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
    const [row] = await db.select().from(rotationPlans).where(eq(rotationPlans.id, id)).limit(1);
    if (!row) return jsonError("Rencana rotasi tidak ditemukan.", 404);
    await requirePlotAccess(user.id, row.plotId);
    const url = new URL(request.url);
    if (url.searchParams.get("confirm") !== "true") {
      return jsonError("Penghapusan perlu konfirmasi.", 400);
    }
    await db.delete(rotationPlans).where(eq(rotationPlans.id, id));
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
