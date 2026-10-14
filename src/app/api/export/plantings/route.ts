import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { crops, plantings, plots } from "@/db/schema";
import { getActiveFarm } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { handleError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const { farm } = await getActiveFarm(user);
    if (!farm) {
      return csvResponse("riwayat-tanam.csv", toCsv(["pesan"], [["Belum ada kebun"]]));
    }
    const rows = await db
      .select({ planting: plantings, crop: crops, plot: plots })
      .from(plantings)
      .innerJoin(crops, eq(plantings.cropId, crops.id))
      .innerJoin(plots, eq(plantings.plotId, plots.id))
      .where(eq(plots.farmId, farm.id))
      .orderBy(desc(plantings.plantDate));

    const csv = toCsv(
      ["kebun", "petak", "tanaman", "status", "tanggal_tanam", "tanggal_panen", "hasil", "satuan", "catatan", "data_contoh_tanaman"],
      rows.map((row) => [
        farm.name,
        row.plot.name,
        row.crop.commonName,
        row.planting.status,
        row.planting.plantDate,
        row.planting.harvestDate,
        row.planting.yieldAmount,
        row.planting.yieldUnit,
        row.planting.notes,
        row.crop.isDemo ? "ya" : "tidak",
      ]),
    );
    return csvResponse("riwayat-tanam.csv", csv);
  } catch (error) {
    return handleError(error);
  }
}
