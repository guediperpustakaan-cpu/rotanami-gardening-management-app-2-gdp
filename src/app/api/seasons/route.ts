import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { getActiveFarm } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { seasonSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const { farm } = await getActiveFarm(user);
    if (!farm) return jsonOk([]);
    const rows = await db.select().from(seasons).where(eq(seasons.farmId, farm.id)).orderBy(seasons.startDate);
    return jsonOk(rows);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { farm } = await getActiveFarm(user);
    if (!farm) return jsonError("Buat kebun terlebih dahulu.", 400);
    const body = await parseBody(request, seasonSchema);
    if (body.endDate < body.startDate) {
      return jsonError("Tanggal selesai musim tidak boleh sebelum tanggal mulai.", 400);
    }
    const [created] = await db
      .insert(seasons)
      .values({
        farmId: farm.id,
        name: body.name,
        startDate: body.startDate,
        endDate: body.endDate,
        notes: body.notes,
      })
      .returning();
    return jsonOk(created, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
