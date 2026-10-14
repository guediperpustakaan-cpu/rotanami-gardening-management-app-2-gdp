import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { crops, plots, rotationPlans, seasons } from "@/db/schema";
import { getActiveFarm, requirePlotAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonOk, parseBody } from "@/lib/http";
import { rotationPlanSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const { farm } = await getActiveFarm(user);
    if (!farm) return jsonOk([]);
    const rows = await db
      .select({ plan: rotationPlans, crop: crops, plot: plots, season: seasons })
      .from(rotationPlans)
      .innerJoin(crops, eq(rotationPlans.cropId, crops.id))
      .innerJoin(plots, eq(rotationPlans.plotId, plots.id))
      .leftJoin(seasons, eq(rotationPlans.seasonId, seasons.id))
      .where(eq(plots.farmId, farm.id))
      .orderBy(desc(rotationPlans.startDate));
    return jsonOk(
      rows.map((row) => ({
        ...row.plan,
        cropName: row.crop.commonName,
        plotName: row.plot.name,
        seasonName: row.season?.name ?? null,
      })),
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, rotationPlanSchema);
    await requirePlotAccess(user.id, body.plotId);
    const [created] = await db
      .insert(rotationPlans)
      .values({
        plotId: body.plotId,
        cropId: body.cropId,
        seasonId: body.seasonId,
        status: body.status ?? "direncanakan",
        startDate: body.startDate,
        endDate: body.endDate,
        reasons: body.reasons ?? [],
        notes: body.notes,
      })
      .returning();
    return jsonOk(created, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
