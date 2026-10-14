import { z } from "zod";

export const plantingStatuses = ["direncanakan", "ditanam", "dipanen", "dibatalkan"] as const;
export const rotationStatuses = ["direncanakan", "aktif", "selesai", "dibatalkan"] as const;
export const reminderStatuses = ["belum", "selesai"] as const;
export const observationCategories = ["hama", "penyakit", "pertumbuhan", "cuaca", "lain"] as const;
export const nutrientNeeds = ["rendah", "sedang", "tinggi"] as const;
export const areaUnits = ["m2", "ha", "bedeng", "pot"] as const;
export const farmRoles = ["pemilik", "anggota"] as const;

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const optionalNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  });

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Tanggal tidak valid");

const requiredDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi dengan format yang benar");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80, "Nama terlalu panjang"),
  email: z.string().trim().email("Alamat email tidak valid").max(120),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Alamat email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80).optional(),
  activeFarmId: z.string().uuid("Kebun tidak valid").optional(),
});

export const farmSchema = z.object({
  name: z.string().trim().min(2, "Nama kebun minimal 2 karakter").max(80),
  location: optionalText.pipe(z.string().max(120).optional()),
  timezone: z.string().trim().min(3).max(60).default("Asia/Jakarta"),
  notes: optionalText.pipe(z.string().max(2000).optional()),
});

export const farmUpdateSchema = farmSchema.partial();

export const deleteConfirmSchema = z.object({
  confirmName: z.string().trim().min(1, "Ketik nama untuk mengonfirmasi penghapusan"),
});

export const plotSchema = z.object({
  farmId: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Nama petak wajib diisi").max(80),
  size: optionalNumber,
  areaUnit: z.enum(areaUnits).default("m2"),
  soilType: optionalText.pipe(z.string().max(80).optional()),
  notes: optionalText.pipe(z.string().max(2000).optional()),
});

export const plotUpdateSchema = plotSchema.omit({ farmId: true }).partial();

export const familySchema = z.object({
  name: z.string().trim().min(2, "Nama keluarga wajib diisi").max(80),
  rotationGroup: optionalText.pipe(z.string().max(80).optional()),
  notes: optionalText.pipe(z.string().max(1000).optional()),
});

export const cropSchema = z.object({
  commonName: z.string().trim().min(1, "Nama tanaman wajib diisi").max(80),
  scientificName: optionalText.pipe(z.string().max(120).optional()),
  familyId: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  nutrientNeed: z.enum(nutrientNeeds).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  isCoverCrop: z.boolean().optional().default(false),
  notes: optionalText.pipe(z.string().max(2000).optional()),
});

export const cropUpdateSchema = cropSchema.partial();

export const seasonSchema = z.object({
  name: z.string().trim().min(2, "Nama musim wajib diisi").max(80),
  startDate: requiredDate,
  endDate: requiredDate,
  notes: optionalText.pipe(z.string().max(1000).optional()),
});

export const plantingSchema = z.object({
  plotId: z.string().uuid("Petak tidak valid"),
  cropId: z.string().uuid("Tanaman tidak valid"),
  seasonId: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  plantDate: requiredDate,
  harvestDate: optionalDate,
  status: z.enum(plantingStatuses).default("direncanakan"),
  yieldAmount: optionalNumber,
  yieldUnit: optionalText.pipe(z.string().max(30).optional()),
  notes: optionalText.pipe(z.string().max(2000).optional()),
});

export const plantingUpdateSchema = plantingSchema.partial().omit({ plotId: true });

export const soilTestSchema = z.object({
  plotId: z.string().uuid("Petak tidak valid"),
  testDate: requiredDate,
  ph: optionalNumber,
  nitrogen: optionalNumber,
  phosphorus: optionalNumber,
  potassium: optionalNumber,
  organicMatter: optionalNumber,
  method: optionalText.pipe(z.string().max(120).optional()),
  notes: optionalText.pipe(z.string().max(2000).optional()),
});

export const soilTestUpdateSchema = soilTestSchema.partial().omit({ plotId: true });

export const observationSchema = z.object({
  plotId: z.string().uuid("Petak tidak valid"),
  plantingId: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  category: z.enum(observationCategories, { message: "Jenis observasi tidak valid" }),
  observedAt: requiredDate,
  description: z.string().trim().min(3, "Deskripsi minimal 3 karakter").max(2000),
});

export const observationUpdateSchema = observationSchema.partial().omit({ plotId: true });

export const rotationSuggestSchema = z.object({
  plotId: z.string().uuid("Petak tidak valid"),
});

export const rotationPlanSchema = z.object({
  plotId: z.string().uuid("Petak tidak valid"),
  cropId: z.string().uuid("Tanaman tidak valid"),
  seasonId: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  status: z.enum(rotationStatuses).default("direncanakan"),
  startDate: requiredDate,
  endDate: optionalDate,
  reasons: z
    .array(z.object({ code: z.string(), text: z.string() }))
    .optional()
    .default([]),
  notes: optionalText.pipe(z.string().max(2000).optional()),
});

export const rotationPlanUpdateSchema = rotationPlanSchema.partial().omit({ plotId: true });

export const reminderSchema = z.object({
  plotId: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  title: z.string().trim().min(2, "Judul wajib diisi").max(120),
  dueDate: requiredDate,
  status: z.enum(reminderStatuses).optional().default("belum"),
  notes: optionalText.pipe(z.string().max(2000).optional()),
});

export const reminderUpdateSchema = reminderSchema.partial();
