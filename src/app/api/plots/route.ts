import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { crops, plantings, plots } from "@/db/schema";
import { getActiveFarm, requireFarmAccess, serializePlot } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { plotSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const { farm } = await getActiveFarm(user);
    if (!farm) return jsonOk([]);
    const rows = await db.select().from(plots).where(eq(plots.farmId, farm.id)).orderBy(plots.name);
    const withLast = await Promise.all(
      rows.map(async (plot) => {
        const [last] = await db
          .select({ planting: plantings, crop: crops })
          .from(plantings)
          .innerJoin(crops, eq(plantings.cropId, crops.id))
          .where(eq(plantings.plotId, plot.id))
          .orderBy(desc(plantings.plantDate), desc(plantings.createdAt))
          .limit(1);
        return {
          ...serializePlot(plot),
          lastPlanting: last
            ? {
                id: last.planting.id,
                cropId: last.planting.cropId,
                cropName: last.crop.commonName,
                status: last.planting.status,
                plantDate: last.planting.plantDate,
                harvestDate: last.planting.harvestDate,
              }
            : null,
        };
      }),
    );
    return jsonOk(withLast);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, plotSchema);
    const { farm } = await getActiveFarm(user);
    const farmId = body.farmId ?? farm?.id;
    if (!farmId) return jsonError("Buat kebun terlebih dahulu sebelum menambah petak.", 400);
    await requireFarmAccess(user.id, farmId);
    const [created] = await db
      .insert(plots)
      .values({
        farmId,
        name: body.name,
        size: body.size !== undefined ? String(body.size) : null,
        areaUnit: body.areaUnit ?? "m2",
        soilType: body.soilType,
        notes: body.notes,
      })
      .returning();
    return jsonOk(serializePlot(created), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
