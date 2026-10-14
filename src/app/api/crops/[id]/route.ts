import { eq } from "drizzle-orm";
import { db } from "@/db";
import { crops } from "@/db/schema";
import { getActiveFarm, requireFarmAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { cropUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [crop] = await db.select().from(crops).where(eq(crops.id, id)).limit(1);
    if (!crop) return jsonError("Tanaman tidak ditemukan.", 404);
    if (crop.isDemo || !crop.farmId) {
      return jsonError("Tanaman data contoh tidak dapat diubah. Salin atau buat tanaman sendiri.", 403);
    }
    await requireFarmAccess(user.id, crop.farmId);
    const body = await parseBody(request, cropUpdateSchema);
    const [updated] = await db
      .update(crops)
      .set({
        commonName: body.commonName,
        scientificName: body.scientificName,
        familyId: body.familyId,
        nutrientNeed: body.nutrientNeed,
        isCoverCrop: body.isCoverCrop,
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(eq(crops.id, id))
      .returning();
    return jsonOk(updated);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { farm } = await getActiveFarm(user);
    const { id } = await params;
    const [crop] = await db.select().from(crops).where(eq(crops.id, id)).limit(1);
    if (!crop) return jsonError("Tanaman tidak ditemukan.", 404);
    if (crop.isDemo || !crop.farmId) {
      return jsonError("Tanaman data contoh tidak dapat dihapus.", 403);
    }
    await requireFarmAccess(user.id, crop.farmId);
    if (farm && crop.farmId !== farm.id) {
      return jsonError("Anda tidak memiliki akses ke data ini.", 403);
    }
    try {
      await db.delete(crops).where(eq(crops.id, id));
    } catch {
      return jsonError("Tanaman tidak dapat dihapus karena masih dipakai pada riwayat atau rencana. Ubah data tersebut lebih dulu.", 409);
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
