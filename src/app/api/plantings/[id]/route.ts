import { eq } from "drizzle-orm";
import { db } from "@/db";
import { plantings } from "@/db/schema";
import { requirePlotAccess, serializePlanting } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { plantingUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [row] = await db.select().from(plantings).where(eq(plantings.id, id)).limit(1);
    if (!row) return jsonError("Riwayat tanam tidak ditemukan.", 404);
    await requirePlotAccess(user.id, row.plotId);
    const body = await parseBody(request, plantingUpdateSchema);
    const plantDate = body.plantDate ?? row.plantDate;
    const harvestDate = body.harvestDate === undefined ? row.harvestDate : body.harvestDate;
    if (harvestDate && harvestDate < plantDate) {
      return jsonError("Tanggal panen tidak boleh sebelum tanggal tanam.", 400);
    }
    const [updated] = await db
      .update(plantings)
      .set({
        cropId: body.cropId,
        seasonId: body.seasonId,
        plantDate: body.plantDate,
        harvestDate: body.harvestDate,
        status: body.status,
        yieldAmount: body.yieldAmount !== undefined ? String(body.yieldAmount) : undefined,
        yieldUnit: body.yieldUnit,
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(eq(plantings.id, id))
      .returning();
    return jsonOk(serializePlanting(updated));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [row] = await db.select().from(plantings).where(eq(plantings.id, id)).limit(1);
    if (!row) return jsonError("Riwayat tanam tidak ditemukan.", 404);
    await requirePlotAccess(user.id, row.plotId);
    const url = new URL(request.url);
    if (url.searchParams.get("confirm") !== "true") {
      return jsonError("Penghapusan perlu konfirmasi.", 400);
    }
    await db.delete(plantings).where(eq(plantings.id, id));
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
