import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { observations, plantings, plots } from "@/db/schema";
import { getActiveFarm, requirePlotAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { observationSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { farm } = await getActiveFarm(user);
    if (!farm) return jsonOk([]);
    const url = new URL(request.url);
    const plotId = url.searchParams.get("plotId");
    if (plotId) await requirePlotAccess(user.id, plotId);
    const rows = await db
      .select({ observation: observations, plot: plots, planting: plantings })
      .from(observations)
      .innerJoin(plots, eq(observations.plotId, plots.id))
      .leftJoin(plantings, eq(observations.plantingId, plantings.id))
      .where(plotId ? eq(observations.plotId, plotId) : eq(plots.farmId, farm.id))
      .orderBy(desc(observations.observedAt));
    return jsonOk(
      rows.map((row) => ({
        ...row.observation,
        plotName: row.plot.name,
        plantingStatus: row.planting?.status ?? null,
      })),
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, observationSchema);
    await requirePlotAccess(user.id, body.plotId);
    if (body.plantingId) {
      const [planting] = await db.select().from(plantings).where(eq(plantings.id, body.plantingId)).limit(1);
      if (!planting || planting.plotId !== body.plotId) {
        return jsonError("Siklus tanam tidak ditemukan pada petak ini.", 400);
      }
    }
    const [created] = await db
      .insert(observations)
      .values({
        plotId: body.plotId,
        plantingId: body.plantingId,
        category: body.category,
        observedAt: body.observedAt,
        description: body.description,
      })
      .returning();
    return jsonOk(created, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
