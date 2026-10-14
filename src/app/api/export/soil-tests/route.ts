import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { plots, soilTests } from "@/db/schema";
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
      return csvResponse("tes-tanah.csv", toCsv(["pesan"], [["Belum ada kebun"]]));
    }
    const rows = await db
      .select({ test: soilTests, plot: plots })
      .from(soilTests)
      .innerJoin(plots, eq(soilTests.plotId, plots.id))
      .where(eq(plots.farmId, farm.id))
      .orderBy(desc(soilTests.testDate));

    const csv = toCsv(
      ["kebun", "petak", "tanggal_tes", "ph", "nitrogen", "fosfor", "kalium", "bahan_organik", "metode", "catatan"],
      rows.map((row) => [
        farm.name,
        row.plot.name,
        row.test.testDate,
        row.test.ph,
        row.test.nitrogen,
        row.test.phosphorus,
        row.test.potassium,
        row.test.organicMatter,
        row.test.method,
        row.test.notes,
      ]),
    );
    return csvResponse("tes-tanah.csv", csv);
  } catch (error) {
    return handleError(error);
  }
}
