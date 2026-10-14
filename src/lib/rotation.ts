export type NutrientNeed = "rendah" | "sedang" | "tinggi" | null;

export type CropInput = {
  id: string;
  commonName: string;
  familyId: string | null;
  familyName: string | null;
  rotationGroup: string | null;
  nutrientNeed: NutrientNeed;
  isCoverCrop: boolean;
};

export type PlantingInput = {
  id: string;
  cropId: string;
  cropName: string;
  familyId: string | null;
  familyName: string | null;
  rotationGroup: string | null;
  nutrientNeed: NutrientNeed;
  isCoverCrop: boolean;
  status: string;
  plantDate: string;
};

export type ObservationInput = {
  category: string;
  plantingId: string | null;
  description: string;
};

export type SuggestionReason = {
  code: string;
  text: string;
};

export type CropSuggestion = {
  cropId: string;
  commonName: string;
  familyName: string | null;
  rank: "utama" | "alternatif";
  reasons: SuggestionReason[];
};

export type SuggestionResult = {
  suggestions: CropSuggestion[];
  insufficientData: boolean;
  summary: string;
  limitations: string[];
  usedData: string[];
  lastPlanting: {
    cropName: string;
    familyName: string | null;
    plantDate: string;
    status: string;
  } | null;
};

const PEST_CATEGORIES = new Set(["hama", "penyakit"]);

const DEFAULT_LIMITATIONS = [
  "Saran ini adalah panduan umum berdasarkan data katalog dan riwayat yang tercatat, bukan diagnosis atau kepastian agronomi.",
  "Tidak ada masa jeda, dosis, atau hasil panen yang dijamin. Sesuaikan dengan iklim, musim, dan kondisi kebun setempat.",
];

export function suggestRotation(input: {
  crops: CropInput[];
  plantings: PlantingInput[];
  observations: ObservationInput[];
}): SuggestionResult {
  const usedData: string[] = [];
  const history = input.plantings
    .filter((p) => p.status !== "dibatalkan")
    .sort((a, b) => b.plantDate.localeCompare(a.plantDate));

  if (history.length) usedData.push("Riwayat penanaman petak");

  const pestNotes = input.observations.filter((o) => PEST_CATEGORIES.has(o.category));
  if (pestNotes.length) usedData.push("Catatan observasi hama/penyakit");
  if (input.crops.some((c) => c.familyId)) usedData.push("Keluarga botani atau kelompok rotasi pada katalog");
  if (input.crops.some((c) => c.nutrientNeed)) usedData.push("Kategori kebutuhan hara (hanya jika terisi)");
  if (input.crops.some((c) => c.isCoverCrop)) usedData.push("Penanda tanaman penutup tanah (hanya jika terisi)");

  const last = history[0] ?? null;
  const lastSummary = last
    ? {
        cropName: last.cropName,
        familyName: last.familyName,
        plantDate: last.plantDate,
        status: last.status,
      }
    : null;

  const cropsWithFamily = input.crops.filter((c) => c.familyId);
  const insufficientData = input.crops.length < 2 || cropsWithFamily.length < 2 || history.length === 0;

  if (input.crops.length === 0) {
    return {
      suggestions: [],
      insufficientData: true,
      summary:
        "Data belum cukup untuk memberi saran yang lebih spesifik. Katalog tanaman masih kosong. Pilih tanaman secara manual setelah menambahkan tanaman ke katalog.",
      limitations: DEFAULT_LIMITATIONS,
      usedData,
      lastPlanting: lastSummary,
    };
  }

  const pestFamilyIds = new Set<string>();
  for (const obs of pestNotes) {
    if (!obs.plantingId) continue;
    const planting = input.plantings.find((p) => p.id === obs.plantingId);
    if (planting?.familyId) pestFamilyIds.add(planting.familyId);
  }

  const scored = input.crops.map((crop) => {
    let score = 10;
    const reasons: SuggestionReason[] = [];

    if (last && crop.id === last.cropId) {
      score -= 6;
      reasons.push({
        code: "same_crop",
        text: `Tanaman ini sama dengan yang terakhir tercatat di petak (${last.cropName}).`,
      });
    }

    if (last?.familyId && crop.familyId && crop.familyId === last.familyId) {
      score -= 12;
      reasons.push({
        code: "same_family",
        text: `Keluarga sama dengan tanaman terakhir${last.familyName ? ` (${last.familyName})` : ""}. Banyak pekebun menyelingi keluarga tanaman, tetapi ini bukan aturan wajib untuk semua jenis.`,
      });
    } else if (last?.familyId && crop.familyId && crop.familyId !== last.familyId) {
      score += 6;
      reasons.push({
        code: "different_family",
        text: `Keluarga berbeda dari tanaman terakhir${last.familyName ? ` (${last.familyName})` : ""}.`,
      });
    }

    if (last?.rotationGroup && crop.rotationGroup && crop.rotationGroup !== last.rotationGroup) {
      score += 3;
      reasons.push({
        code: "different_group",
        text: `Kelompok rotasi katalog berbeda (${crop.rotationGroup} setelah ${last.rotationGroup}).`,
      });
    }

    if (crop.familyId && pestFamilyIds.has(crop.familyId)) {
      score -= 8;
      reasons.push({
        code: "pest_family",
        text: "Ada catatan hama atau penyakit yang tertaut ke siklus tanam dari keluarga ini. Pertimbangkan menyelingi keluarga lain. Ini bukan diagnosis.",
      });
    }

    if (last?.nutrientNeed === "tinggi" && crop.isCoverCrop) {
      score += 4;
      reasons.push({
        code: "cover_after_high",
        text: "Tanaman terakhir tercatat berkebutuhan hara tinggi pada katalog. Tanaman penutup tanah bisa jadi pilihan penyelang, bila sesuai kondisi setempat.",
      });
    } else if (last?.nutrientNeed === "tinggi" && crop.nutrientNeed === "rendah") {
      score += 2;
      reasons.push({
        code: "low_after_high",
        text: "Kebutuhan hara pada katalog lebih rendah dibanding tanaman terakhir yang tercatat tinggi.",
      });
    }

    if (crop.isCoverCrop && !reasons.some((r) => r.code === "cover_after_high")) {
      reasons.push({
        code: "cover_crop",
        text: "Tercatat sebagai tanaman penutup tanah pada katalog.",
      });
    }

    if (!crop.familyId) {
      score -= 2;
      reasons.push({
        code: "missing_family",
        text: "Keluarga botani tanaman ini belum diisi, jadi perbandingan keluarga tidak lengkap.",
      });
    }

    if (reasons.length === 0) {
      reasons.push({
        code: "catalog_only",
        text: "Dipilih dari katalog yang tersedia. Data petak atau atribut tanaman masih terbatas.",
      });
    }

    return { crop, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score || a.crop.commonName.localeCompare(b.crop.commonName, "id"));

  const preferred = last?.familyId
    ? scored.filter((s) => s.crop.familyId !== last.familyId)
    : scored;
  const pool = preferred.length > 0 ? preferred : scored;
  const top = pool.slice(0, 4);

  const suggestions: CropSuggestion[] = top.map((item, index) => ({
    cropId: item.crop.id,
    commonName: item.crop.commonName,
    familyName: item.crop.familyName,
    rank: index === 0 ? "utama" : "alternatif",
    reasons: item.reasons,
  }));

  const summary = insufficientData
    ? "Data belum cukup untuk memberi saran yang lebih spesifik. Anda tetap bisa memilih tanaman secara manual. Pilihan di bawah hanya berdasarkan katalog yang ada dan riwayat yang tercatat (bila ada)."
    : "Saran disusun dari riwayat petak dan data katalog (keluarga tanaman, serta atribut lain hanya jika terisi). Ini panduan umum, bukan rekomendasi mutlak.";

  return {
    suggestions,
    insufficientData,
    summary,
    limitations: DEFAULT_LIMITATIONS,
    usedData,
    lastPlanting: lastSummary,
  };
}
