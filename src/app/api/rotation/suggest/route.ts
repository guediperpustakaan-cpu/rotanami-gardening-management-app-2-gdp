import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { crops, observations, plantings, plantFamilies } from "@/db/schema";
import { getCatalogCrops, requirePlotAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonOk, parseBody } from "@/lib/http";
import { suggestRotation } from "@/lib/rotation";
import { rotationSuggestSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, rotationSuggestSchema);
    const { plot, farm } = await requirePlotAccess(user.id, body.plotId);

    const catalog = await getCatalogCrops(farm.id);
    const plantingRows = await db
      .select({ planting: plantings, crop: crops, family: plantFamilies })
      .from(plantings)
      .innerJoin(crops, eq(plantings.cropId, crops.id))
      .leftJoin(plantFamilies, eq(crops.familyId, plantFamilies.id))
      .where(eq(plantings.plotId, plot.id))
      .orderBy(desc(plantings.plantDate));
    const observationRows = await db.select().from(observations).where(eq(observations.plotId, plot.id));

    const result = suggestRotation({
      crops: catalog.map((c) => ({
        id: c.id,
        commonName: c.commonName,
        familyId: c.familyId,
        familyName: c.family?.name ?? null,
        rotationGroup: c.family?.rotationGroup ?? null,
        nutrientNeed: (c.nutrientNeed as "rendah" | "sedang" | "tinggi" | null) ?? null,
        isCoverCrop: c.isCoverCrop,
      })),
      plantings: plantingRows.map((row) => ({
        id: row.planting.id,
        cropId: row.crop.id,
        cropName: row.crop.commonName,
        familyId: row.crop.familyId,
        familyName: row.family?.name ?? null,
        rotationGroup: row.family?.rotationGroup ?? null,
        nutrientNeed: (row.crop.nutrientNeed as "rendah" | "sedang" | "tinggi" | null) ?? null,
        isCoverCrop: row.crop.isCoverCrop,
        status: row.planting.status,
        plantDate: row.planting.plantDate,
      })),
      observations: observationRows.map((o) => ({
        category: o.category,
        plantingId: o.plantingId,
        description: o.description,
      })),
    });

    return jsonOk({
      plot: { id: plot.id, name: plot.name },
      ...result,
    });
  } catch (error) {
    return handleError(error);
  }
}
