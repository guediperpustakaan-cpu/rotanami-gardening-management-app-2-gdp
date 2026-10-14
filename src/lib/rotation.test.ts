import { describe, expect, it } from "vitest";
import { suggestRotation, type CropInput, type ObservationInput, type PlantingInput } from "./rotation";

const families = {
  sola: { id: "fam-sola", name: "Solanaceae", group: "terung-terungan" },
  bras: { id: "fam-bras", name: "Brassicaceae", group: "kubis-kubisan" },
  faba: { id: "fam-faba", name: "Fabaceae", group: "kacang-kacangan" },
};

function crop(partial: Partial<CropInput> & Pick<CropInput, "id" | "commonName">): CropInput {
  return {
    familyId: null,
    familyName: null,
    rotationGroup: null,
    nutrientNeed: null,
    isCoverCrop: false,
    ...partial,
  };
}

function planting(partial: Partial<PlantingInput> & Pick<PlantingInput, "id" | "cropId" | "cropName" | "plantDate">): PlantingInput {
  return {
    familyId: null,
    familyName: null,
    rotationGroup: null,
    nutrientNeed: null,
    isCoverCrop: false,
    status: "dipanen",
    ...partial,
  };
}

describe("suggestRotation", () => {
  it("mengembalikan data belum cukup jika katalog kosong", () => {
    const result = suggestRotation({ crops: [], plantings: [], observations: [] });
    expect(result.insufficientData).toBe(true);
    expect(result.suggestions).toEqual([]);
    expect(result.summary).toMatch(/Data belum cukup/i);
  });

  it("menandai data belum cukup jika belum ada riwayat tanam", () => {
    const crops: CropInput[] = [
      crop({ id: "t1", commonName: "Tomat", familyId: families.sola.id, familyName: families.sola.name, rotationGroup: families.sola.group, nutrientNeed: "tinggi" }),
      crop({ id: "s1", commonName: "Sawi", familyId: families.bras.id, familyName: families.bras.name, rotationGroup: families.bras.group, nutrientNeed: "sedang" }),
    ];
    const result = suggestRotation({ crops, plantings: [], observations: [] });
    expect(result.insufficientData).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.lastPlanting).toBeNull();
  });

  it("tidak menjadikan tanaman sekeluarga sebagai saran utama", () => {
    const crops: CropInput[] = [
      crop({ id: "tomat", commonName: "Tomat", familyId: families.sola.id, familyName: families.sola.name, rotationGroup: families.sola.group, nutrientNeed: "tinggi" }),
      crop({ id: "cabai", commonName: "Cabai", familyId: families.sola.id, familyName: families.sola.name, rotationGroup: families.sola.group, nutrientNeed: "sedang" }),
      crop({ id: "sawi", commonName: "Sawi", familyId: families.bras.id, familyName: families.bras.name, rotationGroup: families.bras.group, nutrientNeed: "sedang" }),
      crop({ id: "kacang", commonName: "Kacang hijau", familyId: families.faba.id, familyName: families.faba.name, rotationGroup: families.faba.group, nutrientNeed: "rendah", isCoverCrop: true }),
    ];
    const plantings: PlantingInput[] = [
      planting({
        id: "p1",
        cropId: "tomat",
        cropName: "Tomat",
        familyId: families.sola.id,
        familyName: families.sola.name,
        rotationGroup: families.sola.group,
        nutrientNeed: "tinggi",
        plantDate: "2026-01-10",
      }),
    ];
    const result = suggestRotation({ crops, plantings, observations: [] });
    expect(result.insufficientData).toBe(false);
    expect(result.suggestions[0].rank).toBe("utama");
    expect(result.suggestions[0].familyName).not.toBe("Solanaceae");
    expect(result.usedData.some((d) => /riwayat/i.test(d))).toBe(true);
  });

  it("mempertimbangkan catatan hama yang tertaut ke siklus tanam", () => {
    const crops: CropInput[] = [
      crop({ id: "tomat", commonName: "Tomat", familyId: families.sola.id, familyName: families.sola.name, rotationGroup: families.sola.group }),
      crop({ id: "terung", commonName: "Terung", familyId: families.sola.id, familyName: families.sola.name, rotationGroup: families.sola.group }),
      crop({ id: "sawi", commonName: "Sawi", familyId: families.bras.id, familyName: families.bras.name, rotationGroup: families.bras.group }),
    ];
    const plantings: PlantingInput[] = [
      planting({
        id: "p-hama",
        cropId: "tomat",
        cropName: "Tomat",
        familyId: families.sola.id,
        familyName: families.sola.name,
        rotationGroup: families.sola.group,
        plantDate: "2026-02-01",
      }),
    ];
    const observations: ObservationInput[] = [
      { category: "hama", plantingId: "p-hama", description: "Kutu daun pada daun muda" },
    ];
    const result = suggestRotation({ crops, plantings, observations });
    expect(result.suggestions[0].familyName).toBe("Brassicaceae");
    expect(result.usedData.some((d) => /hama/i.test(d))).toBe(true);
    const solaAlt = result.suggestions.find((s) => s.familyName === "Solanaceae");
    if (solaAlt) {
      expect(solaAlt.reasons.some((r) => r.code === "pest_family")).toBe(true);
    }
  });

  it("memunculkan tanaman penutup tanah setelah tanaman berkebutuhan hara tinggi", () => {
    const crops: CropInput[] = [
      crop({ id: "jagung", commonName: "Jagung", familyId: "fam-poa", familyName: "Poaceae", rotationGroup: "rumput-rumputan", nutrientNeed: "tinggi" }),
      crop({ id: "kacang", commonName: "Kacang tanah", familyId: families.faba.id, familyName: families.faba.name, rotationGroup: families.faba.group, nutrientNeed: "rendah", isCoverCrop: true }),
      crop({ id: "sawi", commonName: "Sawi", familyId: families.bras.id, familyName: families.bras.name, rotationGroup: families.bras.group, nutrientNeed: "sedang" }),
    ];
    const plantings: PlantingInput[] = [
      planting({
        id: "p2",
        cropId: "jagung",
        cropName: "Jagung",
        familyId: "fam-poa",
        familyName: "Poaceae",
        rotationGroup: "rumput-rumputan",
        nutrientNeed: "tinggi",
        plantDate: "2026-01-01",
      }),
    ];
    const result = suggestRotation({ crops, plantings, observations: [] });
    const cover = result.suggestions.find((s) => s.cropId === "kacang");
    expect(cover).toBeTruthy();
    expect(cover?.reasons.some((r) => r.code === "cover_after_high")).toBe(true);
  });

  it("tidak mengarang presisi agronomi pada keterbatasan", () => {
    const result = suggestRotation({
      crops: [crop({ id: "a", commonName: "A" })],
      plantings: [],
      observations: [],
    });
    expect(result.limitations.join(" ")).toMatch(/panduan umum/i);
    expect(result.limitations.join(" ")).toMatch(/bukan diagnosis/i);
    expect(result.limitations.join(" ")).toMatch(/bukan.*kepastian agronomi/i);
  });
});
