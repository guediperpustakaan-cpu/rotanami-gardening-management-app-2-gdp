import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { crops, plantings, plots } from "@/db/schema";
import { getActiveFarm, requirePlotAccess, serializePlanting } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { plantingSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { farm } = await getActiveFarm(user);
    if (!farm) return jsonOk([]);
    const url = new URL(request.url);
    const plotId = url.searchParams.get("plotId");
    const rows = await db
      .select({ planting: plantings, crop: crops, plot: plots })
      .from(plantings)
      .innerJoin(crops, eq(plantings.cropId, crops.id))
      .innerJoin(plots, eq(plantings.plotId, plots.id))
      .where(plotId ? eq(plantings.plotId, plotId) : eq(plots.farmId, farm.id))
      .orderBy(desc(plantings.plantDate));
    if (plotId) {
      await requirePlotAccess(user.id, plotId);
    }
    return jsonOk(
      rows.map((row) => ({
        ...serializePlanting(row.planting),
        cropName: row.crop.commonName,
        cropIsDemo: row.crop.isDemo,
        plotName: row.plot.name,
      })),
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, plantingSchema);
    await requirePlotAccess(user.id, body.plotId);
    if (body.harvestDate && body.harvestDate < body.plantDate) {
      return jsonError("Tanggal panen tidak boleh sebelum tanggal tanam.", 400);
    }
    const [created] = await db
      .insert(plantings)
      .values({
        plotId: body.plotId,
        cropId: body.cropId,
        seasonId: body.seasonId,
        plantDate: body.plantDate,
        harvestDate: body.harvestDate,
        status: body.status ?? "direncanakan",
        yieldAmount: body.yieldAmount !== undefined ? String(body.yieldAmount) : null,
        yieldUnit: body.yieldUnit,
        notes: body.notes,
      })
      .returning();
    return jsonOk(serializePlanting(created), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
