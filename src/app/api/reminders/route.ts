import { eq } from "drizzle-orm";
import { db } from "@/db";
import { plots, reminders } from "@/db/schema";
import { getActiveFarm, requirePlotAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { reminderSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const { farm } = await getActiveFarm(user);
    if (!farm) return jsonOk([]);
    const rows = await db
      .select({ reminder: reminders, plot: plots })
      .from(reminders)
      .leftJoin(plots, eq(reminders.plotId, plots.id))
      .where(eq(reminders.farmId, farm.id))
      .orderBy(reminders.dueDate);
    return jsonOk(
      rows.map((row) => ({
        ...row.reminder,
        plotName: row.plot?.name ?? null,
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
    if (!farm) return jsonError("Buat kebun terlebih dahulu.", 400);
    const body = await parseBody(request, reminderSchema);
    if (body.plotId) await requirePlotAccess(user.id, body.plotId);
    const [created] = await db
      .insert(reminders)
      .values({
        farmId: farm.id,
        plotId: body.plotId,
        title: body.title,
        dueDate: body.dueDate,
        status: body.status ?? "belum",
        notes: body.notes,
      })
      .returning();
    return jsonOk(created, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
