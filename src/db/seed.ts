import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./index";
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
  sessions,
  soilTests,
  users,
} from "./schema";
import { hashPassword } from "../lib/password";
import { addDaysIso, todayIso } from "../lib/labels";

const DEMO_EMAIL = "demo@rotanami.local";
const DEMO_PASSWORD = "KebunDemo123";

async function resetDemoUser(userId: string) {
  const farmRows = await db.select({ id: farms.id }).from(farms).where(eq(farms.ownerId, userId));
  const farmIds = farmRows.map((f) => f.id);
  for (const farmId of farmIds) {
    const plotRows = await db.select({ id: plots.id }).from(plots).where(eq(plots.farmId, farmId));
    const plotIds = plotRows.map((p) => p.id);
    for (const plotId of plotIds) {
      await db.delete(observations).where(eq(observations.plotId, plotId));
      await db.delete(soilTests).where(eq(soilTests.plotId, plotId));
      await db.delete(rotationPlans).where(eq(rotationPlans.plotId, plotId));
      await db.delete(plantings).where(eq(plantings.plotId, plotId));
      await db.delete(reminders).where(eq(reminders.plotId, plotId));
    }
    await db.delete(reminders).where(eq(reminders.farmId, farmId));
    await db.delete(plots).where(eq(plots.farmId, farmId));
    await db.delete(seasons).where(eq(seasons.farmId, farmId));
    await db.delete(crops).where(eq(crops.farmId, farmId));
    await db.delete(farmMembers).where(eq(farmMembers.farmId, farmId));
    await db.update(users).set({ activeFarmId: null }).where(eq(users.activeFarmId, farmId));
    await db.delete(farms).where(eq(farms.id, farmId));
  }
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

async function seedFamilies() {
  const existing = await db.select().from(plantFamilies);
  if (existing.length > 0) return existing;

  return db
    .insert(plantFamilies)
    .values([
      { name: "Solanaceae", rotationGroup: "terung-terungan", notes: "Contoh: tomat, cabai, terung.", isDemo: true },
      { name: "Brassicaceae", rotationGroup: "kubis-kubisan", notes: "Contoh: sawi, kubis, brokoli.", isDemo: true },
      { name: "Fabaceae", rotationGroup: "kacang-kacangan", notes: "Contoh: kacang panjang, kacang tanah.", isDemo: true },
      { name: "Cucurbitaceae", rotationGroup: "labu-labuan", notes: "Contoh: mentimun, labu.", isDemo: true },
      { name: "Amaranthaceae", rotationGroup: "bayam-bayaman", notes: "Contoh: bayam.", isDemo: true },
      { name: "Poaceae", rotationGroup: "rumput-rumputan", notes: "Contoh: jagung.", isDemo: true },
      { name: "Amaryllidaceae", rotationGroup: "bawang-bawangan", notes: "Contoh: bawang daun.", isDemo: true },
      { name: "Lamiaceae", rotationGroup: "daun-aromatik", notes: "Contoh: kemangi.", isDemo: true },
      { name: "Convolvulaceae", rotationGroup: "kangkung-kangkungan", notes: "Contoh: kangkung.", isDemo: true },
      { name: "Asteraceae", rotationGroup: "kenikir-kenikiran", notes: "Contoh: kenikir.", isDemo: true },
      { name: "Zingiberaceae", rotationGroup: "jahe-jahean", notes: "Contoh: jahe.", isDemo: true },
    ])
    .returning();
}

async function seedCrops(familyRows: (typeof plantFamilies.$inferSelect)[]) {
  const existing = await db.select().from(crops).where(eq(crops.isDemo, true));
  if (existing.length > 0) return existing;
  const byName = Object.fromEntries(familyRows.map((f) => [f.name, f.id]));

  return db
    .insert(crops)
    .values([
      { commonName: "Tomat", scientificName: "Solanum lycopersicum", familyId: byName.Solanaceae, nutrientNeed: "tinggi", isCoverCrop: false, isDemo: true, notes: "Data contoh. Menyukai sinar matahari. Bukan rekomendasi varietas." },
      { commonName: "Cabai", scientificName: "Capsicum annuum", familyId: byName.Solanaceae, nutrientNeed: "sedang", isCoverCrop: false, isDemo: true, notes: "Data contoh. Keluarga terung-terungan." },
      { commonName: "Terung", scientificName: "Solanum melongena", familyId: byName.Solanaceae, nutrientNeed: "sedang", isCoverCrop: false, isDemo: true, notes: "Data contoh." },
      { commonName: "Sawi", scientificName: "Brassica rapa", familyId: byName.Brassicaceae, nutrientNeed: "sedang", isCoverCrop: false, isDemo: true, notes: "Data contoh. Umur panen relatif pendek." },
      { commonName: "Kubis", scientificName: "Brassica oleracea", familyId: byName.Brassicaceae, nutrientNeed: "tinggi", isCoverCrop: false, isDemo: true, notes: "Data contoh." },
      { commonName: "Kacang panjang", scientificName: "Vigna unguiculata", familyId: byName.Fabaceae, nutrientNeed: "rendah", isCoverCrop: false, isDemo: true, notes: "Data contoh. Keluarga kacang-kacangan." },
      { commonName: "Kacang tanah", scientificName: "Arachis hypogaea", familyId: byName.Fabaceae, nutrientNeed: "rendah", isCoverCrop: true, isDemo: true, notes: "Data contoh. Ditandai sebagai tanaman penutup tanah pada katalog contoh." },
      { commonName: "Kacang hijau", scientificName: "Vigna radiata", familyId: byName.Fabaceae, nutrientNeed: "rendah", isCoverCrop: true, isDemo: true, notes: "Data contoh. Sering dipakai sebagai tanaman sela atau penutup." },
      { commonName: "Mentimun", scientificName: "Cucumis sativus", familyId: byName.Cucurbitaceae, nutrientNeed: "sedang", isCoverCrop: false, isDemo: true, notes: "Data contoh." },
      { commonName: "Labu kuning", scientificName: "Cucurbita moschata", familyId: byName.Cucurbitaceae, nutrientNeed: "sedang", isCoverCrop: false, isDemo: true, notes: "Data contoh." },
      { commonName: "Bayam", scientificName: "Amaranthus spp.", familyId: byName.Amaranthaceae, nutrientNeed: "rendah", isCoverCrop: false, isDemo: true, notes: "Data contoh." },
      { commonName: "Jagung", scientificName: "Zea mays", familyId: byName.Poaceae, nutrientNeed: "tinggi", isCoverCrop: false, isDemo: true, notes: "Data contoh. Kebutuhan hara pada katalog tercatat tinggi." },
      { commonName: "Bawang daun", scientificName: "Allium fistulosum", familyId: byName.Amaryllidaceae, nutrientNeed: "sedang", isCoverCrop: false, isDemo: true, notes: "Data contoh." },
      { commonName: "Kemangi", scientificName: "Ocimum basilicum", familyId: byName.Lamiaceae, nutrientNeed: "rendah", isCoverCrop: false, isDemo: true, notes: "Data contoh. Tanaman aromatik." },
      { commonName: "Kangkung", scientificName: "Ipomoea aquatica", familyId: byName.Convolvulaceae, nutrientNeed: "rendah", isCoverCrop: false, isDemo: true, notes: "Data contoh." },
      { commonName: "Kenikir", scientificName: "Cosmos caudatus", familyId: byName.Asteraceae, nutrientNeed: "rendah", isCoverCrop: true, isDemo: true, notes: "Data contoh. Kadang ditanam sebagai tanaman sela." },
      { commonName: "Jahe", scientificName: "Zingiber officinale", familyId: byName.Zingiberaceae, nutrientNeed: "sedang", isCoverCrop: false, isDemo: true, notes: "Data contoh." },
    ])
    .returning();
}

async function main() {
  console.log("Menyiapkan data contoh Rotanami...");
  const familyRows = await seedFamilies();
  const cropRows = await seedCrops(familyRows);
  const cropByName = Object.fromEntries(cropRows.map((c) => [c.commonName, c]));

  const [existingUser] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  let userId = existingUser?.id;
  if (existingUser) {
    await resetDemoUser(existingUser.id);
    await db
      .update(users)
      .set({ name: "Sari Kebun (Data contoh)", passwordHash: await hashPassword(DEMO_PASSWORD), updatedAt: new Date() })
      .where(eq(users.id, existingUser.id));
    userId = existingUser.id;
  } else {
    const [created] = await db
      .insert(users)
      .values({
        name: "Sari Kebun (Data contoh)",
        email: DEMO_EMAIL,
        passwordHash: await hashPassword(DEMO_PASSWORD),
      })
      .returning();
    userId = created.id;
  }

  const today = todayIso("Asia/Jakarta");
  const [farm] = await db
    .insert(farms)
    .values({
      ownerId: userId!,
      name: "Kebun Belakang (Data contoh)",
      location: "Yogyakarta (contoh)",
      timezone: "Asia/Jakarta",
      notes: "Kebun rumahan contoh untuk mencoba Rotanami. Semua angka dan riwayat di akun ini adalah data contoh.",
      isDemo: true,
    })
    .returning();

  await db.insert(farmMembers).values({ farmId: farm.id, userId: userId!, role: "pemilik" });
  await db.update(users).set({ activeFarmId: farm.id, updatedAt: new Date() }).where(eq(users.id, userId!));

  const [seasonRain, seasonDry] = await db
    .insert(seasons)
    .values([
      {
        farmId: farm.id,
        name: "Musim hujan (Data contoh)",
        startDate: addDaysIso(today, -120),
        endDate: addDaysIso(today, 10),
        notes: "Rentang contoh, bukan kalender iklim resmi.",
      },
      {
        farmId: farm.id,
        name: "Musim kemarau (Data contoh)",
        startDate: addDaysIso(today, 11),
        endDate: addDaysIso(today, 190),
        notes: "Rentang contoh untuk rencana rotasi.",
      },
    ])
    .returning();

  const [bedA, bedB, bedC] = await db
    .insert(plots)
    .values([
      { farmId: farm.id, name: "Bedeng A", size: "8.00", areaUnit: "m2", soilType: "Lempung berpasir", notes: "Dekat pagar. Data contoh." },
      { farmId: farm.id, name: "Bedeng B", size: "6.00", areaUnit: "m2", soilType: "Lempung", notes: "Mendapat sinar pagi. Data contoh." },
      { farmId: farm.id, name: "Bedeng C", size: "4.00", areaUnit: "m2", soilType: null, notes: "Belum ada riwayat tanam. Data contoh." },
    ])
    .returning();

  const [tomatCycle, jagungCycle] = await db
    .insert(plantings)
    .values([
      {
        plotId: bedA.id,
        cropId: cropByName.Tomat.id,
        seasonId: seasonRain.id,
        plantDate: addDaysIso(today, -90),
        harvestDate: addDaysIso(today, -12),
        status: "dipanen",
        yieldAmount: "6.50",
        yieldUnit: "kg",
        notes: "Data contoh. Panen bertahap selama dua minggu.",
      },
      {
        plotId: bedA.id,
        cropId: cropByName.Sawi.id,
        seasonId: seasonRain.id,
        plantDate: addDaysIso(today, 7),
        harvestDate: null,
        status: "direncanakan",
        notes: "Data contoh. Rencana tanam sawi setelah tomat.",
      },
      {
        plotId: bedB.id,
        cropId: cropByName.Jagung.id,
        seasonId: seasonRain.id,
        plantDate: addDaysIso(today, -40),
        harvestDate: addDaysIso(today, 20),
        status: "ditanam",
        notes: "Data contoh. Perkiraan panen diisi pengguna, bukan prediksi sistem.",
      },
    ])
    .returning();

  await db.insert(observations).values([
    {
      plotId: bedA.id,
      plantingId: tomatCycle.id,
      category: "hama",
      observedAt: addDaysIso(today, -60),
      description: "Data contoh. Kutu daun pada pucuk tomat, dikendalikan dengan semprotan air sabun.",
    },
    {
      plotId: bedB.id,
      plantingId: jagungCycle.id,
      category: "pertumbuhan",
      observedAt: addDaysIso(today, -10),
      description: "Data contoh. Batang kokoh, daun hijau. Belum ada gejala yang mencolok.",
    },
  ]);

  await db.insert(soilTests).values([
    {
      plotId: bedA.id,
      testDate: addDaysIso(today, -11),
      ph: "6.20",
      nitrogen: "1.20",
      phosphorus: "18.00",
      potassium: "140.00",
      organicMatter: "3.10",
      method: "Kit tes kebun (Data contoh)",
      notes: "Angka ini contoh. Bukan hasil laboratorium sungguhan.",
    },
    {
      plotId: bedA.id,
      testDate: addDaysIso(today, -80),
      ph: "5.90",
      nitrogen: null,
      phosphorus: null,
      potassium: null,
      organicMatter: "2.40",
      method: "Kit tes kebun (Data contoh)",
      notes: "Hanya pH dan bahan organik yang diisi. Nilai lain dibiarkan kosong.",
    },
  ]);

  await db.insert(rotationPlans).values({
    plotId: bedA.id,
    seasonId: seasonDry.id,
    cropId: cropByName["Kacang hijau"].id,
    status: "direncanakan",
    startDate: addDaysIso(today, 20),
    endDate: addDaysIso(today, 90),
    reasons: [
      { code: "different_family", text: "Keluarga berbeda dari tomat (Solanaceae)." },
      { code: "cover_after_high", text: "Kacang hijau tercatat sebagai tanaman penutup tanah pada katalog contoh." },
    ],
    notes: "Data contoh. Rencana bisa diubah atau dibatalkan.",
  });

  await db.insert(reminders).values([
    {
      farmId: farm.id,
      plotId: bedB.id,
      title: "Periksa jagung Bedeng B",
      dueDate: addDaysIso(today, 2),
      status: "belum",
      notes: "Pengingat di dalam aplikasi. Data contoh.",
    },
    {
      farmId: farm.id,
      plotId: bedA.id,
      title: "Siapkan benih sawi",
      dueDate: today,
      status: "belum",
      notes: "Data contoh.",
    },
    {
      farmId: farm.id,
      plotId: bedC.id,
      title: "Tandai jenis tanah Bedeng C",
      dueDate: addDaysIso(today, -3),
      status: "selesai",
      notes: "Data contoh yang sudah selesai.",
    },
  ]);

  console.log("Selesai.");
  console.log(`Akun contoh: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
