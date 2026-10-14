import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { plots, soilTests } from "@/db/schema";
import { getActiveFarm, requirePlotAccess, serializeSoilTest } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonOk, parseBody } from "@/lib/http";
import { soilTestSchema } from "@/lib/validations";

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
      .select({ test: soilTests, plot: plots })
      .from(soilTests)
      .innerJoin(plots, eq(soilTests.plotId, plots.id))
      .where(plotId ? eq(soilTests.plotId, plotId) : eq(plots.farmId, farm.id))
      .orderBy(desc(soilTests.testDate));
    return jsonOk(
      rows.map((row) => ({
        ...serializeSoilTest(row.test),
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
    const body = await parseBody(request, soilTestSchema);
    await requirePlotAccess(user.id, body.plotId);
    const [created] = await db
      .insert(soilTests)
      .values({
        plotId: body.plotId,
        testDate: body.testDate,
        ph: body.ph !== undefined ? String(body.ph) : null,
        nitrogen: body.nitrogen !== undefined ? String(body.nitrogen) : null,
        phosphorus: body.phosphorus !== undefined ? String(body.phosphorus) : null,
        potassium: body.potassium !== undefined ? String(body.potassium) : null,
        organicMatter: body.organicMatter !== undefined ? String(body.organicMatter) : null,
        method: body.method,
        notes: body.notes,
      })
      .returning();
    return jsonOk(serializeSoilTest(created), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
