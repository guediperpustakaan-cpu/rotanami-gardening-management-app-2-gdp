import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  crops,
  farmMembers,
  farms,
  observations,
  plantFamilies,
  plantings,
  plots,
  reminders,
  rotationPlans,
  seasons,
  soilTests,
} from "@/db/schema";
import type { SessionUser } from "./auth";
import { numericOrNull } from "./labels";

export type FarmRecord = typeof farms.$inferSelect;

export async function listAccessibleFarms(userId: string) {
  const owned = await db.select().from(farms).where(eq(farms.ownerId, userId));
  const memberRows = await db
    .select({ farm: farms })
    .from(farmMembers)
    .innerJoin(farms, eq(farmMembers.farmId, farms.id))
    .where(eq(farmMembers.userId, userId));
  const map = new Map<string, FarmRecord>();
  for (const farm of owned) map.set(farm.id, farm);
  for (const row of memberRows) map.set(row.farm.id, row.farm);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function getActiveFarm(user: SessionUser) {
  const accessible = await listAccessibleFarms(user.id);
  if (accessible.length === 0) return { farm: null as FarmRecord | null, farms: accessible };
  const current =
    accessible.find((f) => f.id === user.activeFarmId) ?? accessible[0];
  if (current.id !== user.activeFarmId) {
    const { users } = await import("@/db/schema");
    await db.update(users).set({ activeFarmId: current.id, updatedAt: new Date() }).where(eq(users.id, user.id));
  }
  return { farm: current, farms: accessible };
}

export async function requireFarmAccess(userId: string, farmId: string) {
  const [farm] = await db.select().from(farms).where(eq(farms.id, farmId)).limit(1);
  if (!farm) throw new Error("NOT_FOUND");
  if (farm.ownerId === userId) return farm;
  const [member] = await db
    .select()
    .from(farmMembers)
    .where(and(eq(farmMembers.farmId, farmId), eq(farmMembers.userId, userId)))
    .limit(1);
  if (!member) throw new Error("FORBIDDEN");
  return farm;
}

export async function requirePlotAccess(userId: string, plotId: string) {
  const [plot] = await db.select().from(plots).where(eq(plots.id, plotId)).limit(1);
  if (!plot) throw new Error("NOT_FOUND");
  const farm = await requireFarmAccess(userId, plot.farmId);
  return { plot, farm };
}

export async function requireOwner(userId: string, farmId: string) {
  const farm = await requireFarmAccess(userId, farmId);
  if (farm.ownerId !== userId) throw new Error("FORBIDDEN");
  return farm;
}

export function toNum(value: string | null | undefined) {
  return numericOrNull(value);
}

export function serializePlot(plot: typeof plots.$inferSelect) {
  return {
    ...plot,
    size: toNum(plot.size),
  };
}

export function serializePlanting(row: typeof plantings.$inferSelect) {
  return {
    ...row,
    yieldAmount: toNum(row.yieldAmount),
  };
}

export function serializeSoilTest(row: typeof soilTests.$inferSelect) {
  return {
    ...row,
    ph: toNum(row.ph),
    nitrogen: toNum(row.nitrogen),
    phosphorus: toNum(row.phosphorus),
    potassium: toNum(row.potassium),
    organicMatter: toNum(row.organicMatter),
  };
}

export async function deletePlotCascade(plotId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(observations).where(eq(observations.plotId, plotId));
    await tx.delete(soilTests).where(eq(soilTests.plotId, plotId));
    await tx.delete(rotationPlans).where(eq(rotationPlans.plotId, plotId));
    await tx.delete(reminders).where(eq(reminders.plotId, plotId));
    await tx.delete(plantings).where(eq(plantings.plotId, plotId));
    await tx.delete(plots).where(eq(plots.id, plotId));
  });
}

export async function deleteFarmCascade(farmId: string) {
  await db.transaction(async (tx) => {
    const plotRows = await tx.select({ id: plots.id }).from(plots).where(eq(plots.farmId, farmId));
    const plotIds = plotRows.map((p) => p.id);
    if (plotIds.length > 0) {
      await tx.delete(observations).where(inArray(observations.plotId, plotIds));
      await tx.delete(soilTests).where(inArray(soilTests.plotId, plotIds));
      await tx.delete(rotationPlans).where(inArray(rotationPlans.plotId, plotIds));
      await tx.delete(plantings).where(inArray(plantings.plotId, plotIds));
    }
    await tx.delete(reminders).where(eq(reminders.farmId, farmId));
    if (plotIds.length > 0) {
      await tx.delete(plots).where(inArray(plots.id, plotIds));
    }
    await tx.delete(seasons).where(eq(seasons.farmId, farmId));
    await tx.delete(crops).where(eq(crops.farmId, farmId));
    await tx.delete(farmMembers).where(eq(farmMembers.farmId, farmId));
    const { users } = await import("@/db/schema");
    await tx.update(users).set({ activeFarmId: null }).where(eq(users.activeFarmId, farmId));
    await tx.delete(farms).where(eq(farms.id, farmId));
  });
}

export async function getCatalogCrops(farmId: string) {
  const rows = await db
    .select({ crop: crops, family: plantFamilies })
    .from(crops)
    .leftJoin(plantFamilies, eq(crops.familyId, plantFamilies.id))
    .where(or(eq(crops.isDemo, true), eq(crops.farmId, farmId)))
    .orderBy(asc(crops.commonName));
  return rows.map((row) => ({ ...row.crop, family: row.family }));
}
