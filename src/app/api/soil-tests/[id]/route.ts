import { eq } from "drizzle-orm";
import { db } from "@/db";
import { soilTests } from "@/db/schema";
import { requirePlotAccess, serializeSoilTest } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { soilTestUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [row] = await db.select().from(soilTests).where(eq(soilTests.id, id)).limit(1);
    if (!row) return jsonError("Hasil tes tanah tidak ditemukan.", 404);
    await requirePlotAccess(user.id, row.plotId);
    const body = await parseBody(request, soilTestUpdateSchema);
    const [updated] = await db
      .update(soilTests)
      .set({
        testDate: body.testDate,
        ph: body.ph !== undefined ? String(body.ph) : undefined,
        nitrogen: body.nitrogen !== undefined ? String(body.nitrogen) : undefined,
        phosphorus: body.phosphorus !== undefined ? String(body.phosphorus) : undefined,
        potassium: body.potassium !== undefined ? String(body.potassium) : undefined,
        organicMatter: body.organicMatter !== undefined ? String(body.organicMatter) : undefined,
        method: body.method,
        notes: body.notes,
      })
      .where(eq(soilTests.id, id))
      .returning();
    return jsonOk(serializeSoilTest(updated));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [row] = await db.select().from(soilTests).where(eq(soilTests.id, id)).limit(1);
    if (!row) return jsonError("Hasil tes tanah tidak ditemukan.", 404);
    await requirePlotAccess(user.id, row.plotId);
    const url = new URL(request.url);
    if (url.searchParams.get("confirm") !== "true") {
      return jsonError("Penghapusan perlu konfirmasi.", 400);
    }
    await db.delete(soilTests).where(eq(soilTests.id, id));
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
