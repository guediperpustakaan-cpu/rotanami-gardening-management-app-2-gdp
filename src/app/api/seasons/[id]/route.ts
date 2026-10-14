import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { requireFarmAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { seasonSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [season] = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
    if (!season) return jsonError("Musim tidak ditemukan.", 404);
    await requireFarmAccess(user.id, season.farmId);
    const body = await parseBody(request, seasonSchema.partial());
    const startDate = body.startDate ?? season.startDate;
    const endDate = body.endDate ?? season.endDate;
    if (endDate < startDate) {
      return jsonError("Tanggal selesai musim tidak boleh sebelum tanggal mulai.", 400);
    }
    const [updated] = await db
      .update(seasons)
      .set({
        name: body.name,
        startDate: body.startDate,
        endDate: body.endDate,
        notes: body.notes,
      })
      .where(eq(seasons.id, id))
      .returning();
    return jsonOk(updated);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [season] = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
    if (!season) return jsonError("Musim tidak ditemukan.", 404);
    await requireFarmAccess(user.id, season.farmId);
    await db.delete(seasons).where(eq(seasons.id, id));
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
