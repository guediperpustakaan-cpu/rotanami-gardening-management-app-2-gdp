import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { crops, observations, plantings, plots, rotationPlans, soilTests } from "@/db/schema";
import { deletePlotCascade, requirePlotAccess, serializePlanting, serializePlot, serializeSoilTest } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { plotUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { plot, farm } = await requirePlotAccess(user.id, id);
    const plantingRows = await db
      .select({ planting: plantings, crop: crops })
      .from(plantings)
      .innerJoin(crops, eq(plantings.cropId, crops.id))
      .where(eq(plantings.plotId, id))
      .orderBy(desc(plantings.plantDate), desc(plantings.createdAt));
    const soilRows = await db.select().from(soilTests).where(eq(soilTests.plotId, id)).orderBy(desc(soilTests.testDate));
    const observationRows = await db
      .select()
      .from(observations)
      .where(eq(observations.plotId, id))
      .orderBy(desc(observations.observedAt));
    const planRows = await db
      .select({ plan: rotationPlans, crop: crops })
      .from(rotationPlans)
      .innerJoin(crops, eq(rotationPlans.cropId, crops.id))
      .where(eq(rotationPlans.plotId, id))
      .orderBy(desc(rotationPlans.startDate));

    return jsonOk({
      plot: serializePlot(plot),
      farm: { id: farm.id, name: farm.name, timezone: farm.timezone, isDemo: farm.isDemo },
      plantings: plantingRows.map((row) => ({
        ...serializePlanting(row.planting),
        cropName: row.crop.commonName,
        cropIsDemo: row.crop.isDemo,
      })),
      soilTests: soilRows.map(serializeSoilTest),
      observations: observationRows,
      rotationPlans: planRows.map((row) => ({
        ...row.plan,
        cropName: row.crop.commonName,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await requirePlotAccess(user.id, id);
    const body = await parseBody(request, plotUpdateSchema);
    const [updated] = await db
      .update(plots)
      .set({
        name: body.name,
        size: body.size !== undefined ? String(body.size) : undefined,
        areaUnit: body.areaUnit,
        soilType: body.soilType,
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(eq(plots.id, id))
      .returning();
    return jsonOk(serializePlot(updated));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { plot } = await requirePlotAccess(user.id, id);
    const url = new URL(request.url);
    const confirm = url.searchParams.get("confirm");
    if (confirm !== "true") {
      return jsonError("Penghapusan petak perlu konfirmasi. Tambahkan ?confirm=true setelah mengetik nama petak.", 400);
    }
    let body: { confirmName?: string } = {};
    try {
      body = (await request.json()) as { confirmName?: string };
    } catch {
      body = {};
    }
    if (!body.confirmName || body.confirmName.trim() !== plot.name.trim()) {
      return jsonError("Ketik nama petak yang sama untuk mengonfirmasi penghapusan.", 400);
    }
    await deletePlotCascade(id);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
