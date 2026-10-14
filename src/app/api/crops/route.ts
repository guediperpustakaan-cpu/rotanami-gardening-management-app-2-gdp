import { eq } from "drizzle-orm";
import { db } from "@/db";
import { crops, plantFamilies } from "@/db/schema";
import { getActiveFarm, getCatalogCrops } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { cropSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const { farm } = await getActiveFarm(user);
    if (!farm) return jsonOk([]);
    const rows = await getCatalogCrops(farm.id);
    return jsonOk(
      rows.map((row) => ({
        id: row.id,
        farmId: row.farmId,
        commonName: row.commonName,
        scientificName: row.scientificName,
        familyId: row.familyId,
        familyName: row.family?.name ?? null,
        rotationGroup: row.family?.rotationGroup ?? null,
        nutrientNeed: row.nutrientNeed,
        isCoverCrop: row.isCoverCrop,
        notes: row.notes,
        isDemo: row.isDemo,
        createdAt: row.createdAt,
      })),
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { farm } = await getActiveFarm(user);
    if (!farm) return jsonError("Buat kebun terlebih dahulu sebelum menambah tanaman.", 400);
    const body = await parseBody(request, cropSchema);
    if (body.familyId) {
      const [family] = await db.select().from(plantFamilies).where(eq(plantFamilies.id, body.familyId)).limit(1);
      if (!family) return jsonError("Keluarga tanaman tidak ditemukan.", 400);
    }
    const [created] = await db
      .insert(crops)
      .values({
        farmId: farm.id,
        commonName: body.commonName,
        scientificName: body.scientificName,
        familyId: body.familyId,
        nutrientNeed: body.nutrientNeed,
        isCoverCrop: body.isCoverCrop ?? false,
        notes: body.notes,
        isDemo: false,
      })
      .returning();
    return jsonOk(created, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
