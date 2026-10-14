import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { crops, plantings, plots, reminders, rotationPlans, seasons } from "@/db/schema";
import { getActiveFarm, serializePlot } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonOk } from "@/lib/http";
import { addDaysIso, todayIso } from "@/lib/labels";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const { farm, farms } = await getActiveFarm(user);
    if (!farm) {
      return jsonOk({
        user,
        farm: null,
        farms,
        summary: { plotCount: 0, seasonPlanCount: 0, plantedPlotCount: 0, pendingActionCount: 0 },
        plots: [],
        upcoming: [],
        currentSeason: null,
      });
    }

    const today = todayIso(farm.timezone);
    const plotRows = await db.select().from(plots).where(eq(plots.farmId, farm.id)).orderBy(plots.name);
    const [currentSeason] =
      (await db
        .select()
        .from(seasons)
        .where(and(eq(seasons.farmId, farm.id), lte(seasons.startDate, today), gte(seasons.endDate, today)))
        .limit(1)) ?? [];

    const planRows = await db
      .select({ plan: rotationPlans, plot: plots })
      .from(rotationPlans)
      .innerJoin(plots, eq(rotationPlans.plotId, plots.id))
      .where(eq(plots.farmId, farm.id));

    const seasonPlans = currentSeason
      ? planRows.filter((row) => row.plan.seasonId === currentSeason.id && row.plan.status !== "dibatalkan")
      : planRows.filter((row) => row.plan.status === "direncanakan" || row.plan.status === "aktif");

    const plantingRows = await db
      .select({ planting: plantings, crop: crops, plot: plots })
      .from(plantings)
      .innerJoin(crops, eq(plantings.cropId, crops.id))
      .innerJoin(plots, eq(plantings.plotId, plots.id))
      .where(eq(plots.farmId, farm.id))
      .orderBy(desc(plantings.plantDate));

    const plantedPlotIds = new Set(
      plantingRows.filter((row) => row.planting.status === "ditanam").map((row) => row.planting.plotId),
    );

    const reminderRows = await db.select().from(reminders).where(eq(reminders.farmId, farm.id));
    const pendingReminders = reminderRows.filter((r) => r.status === "belum");

    const plotsWithLast = plotRows.map((plot) => {
      const last = plantingRows.find((row) => row.planting.plotId === plot.id);
      return {
        ...serializePlot(plot),
        lastPlanting: last
          ? {
              id: last.planting.id,
              cropName: last.crop.commonName,
              status: last.planting.status,
              plantDate: last.planting.plantDate,
            }
          : null,
      };
    });

    type Upcoming = {
      id: string;
      type: "pengingat" | "tanam" | "panen" | "rencana";
      title: string;
      date: string;
      plotName: string | null;
      status: string;
      href: string;
    };

    const upcoming: Upcoming[] = [];

    for (const reminder of reminderRows) {
      const plot = plotRows.find((p) => p.id === reminder.plotId);
      upcoming.push({
        id: reminder.id,
        type: "pengingat",
        title: reminder.title,
        date: reminder.dueDate,
        plotName: plot?.name ?? null,
        status: reminder.status,
        href: "/kalender",
      });
    }

    for (const row of plantingRows) {
      if (row.planting.status === "direncanakan") {
        upcoming.push({
          id: row.planting.id,
          type: "tanam",
          title: `Tanam ${row.crop.commonName}`,
          date: row.planting.plantDate,
          plotName: row.plot.name,
          status: row.planting.status,
          href: `/petak/${row.plot.id}`,
        });
      }
      if (row.planting.status === "ditanam" && row.planting.harvestDate) {
        upcoming.push({
          id: `${row.planting.id}-panen`,
          type: "panen",
          title: `Panen ${row.crop.commonName}`,
          date: row.planting.harvestDate,
          plotName: row.plot.name,
          status: row.planting.status,
          href: `/petak/${row.plot.id}`,
        });
      }
    }

    for (const row of planRows) {
      if (row.plan.status === "dibatalkan" || row.plan.status === "selesai") continue;
      upcoming.push({
        id: row.plan.id,
        type: "rencana",
        title: `Rencana rotasi`,
        date: row.plan.startDate,
        plotName: row.plot.name,
        status: row.plan.status,
        href: "/rotasi",
      });
    }

    upcoming.sort((a, b) => a.date.localeCompare(b.date));
    const horizon = addDaysIso(today, 45);
    const upcomingWindow = upcoming.filter((item) => item.date <= horizon).slice(0, 12);

    const overdueCount = pendingReminders.filter((r) => r.dueDate < today).length;
    const dueSoon = pendingReminders.filter((r) => r.dueDate >= today && r.dueDate <= addDaysIso(today, 7)).length;
    const plannedPlantings = plantingRows.filter(
      (row) => row.planting.status === "direncanakan" && row.planting.plantDate <= addDaysIso(today, 14),
    ).length;

    return jsonOk({
      user,
      farm,
      farms,
      currentSeason,
      summary: {
        plotCount: plotRows.length,
        seasonPlanCount: seasonPlans.length,
        plantedPlotCount: plantedPlotIds.size,
        pendingActionCount: overdueCount + dueSoon + plannedPlantings,
      },
      plots: plotsWithLast,
      upcoming: upcomingWindow,
      today,
    });
  } catch (error) {
    return handleError(error);
  }
}
