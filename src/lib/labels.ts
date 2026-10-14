export const plantingStatusLabels: Record<string, string> = {
  direncanakan: "Direncanakan",
  ditanam: "Ditanam",
  dipanen: "Dipanen",
  dibatalkan: "Dibatalkan",
};

export const rotationStatusLabels: Record<string, string> = {
  direncanakan: "Direncanakan",
  aktif: "Aktif",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const reminderStatusLabels: Record<string, string> = {
  belum: "Belum dilakukan",
  selesai: "Selesai",
};

export const observationCategoryLabels: Record<string, string> = {
  hama: "Hama",
  penyakit: "Penyakit",
  pertumbuhan: "Pertumbuhan",
  cuaca: "Cuaca",
  lain: "Catatan lain",
};

export const nutrientNeedLabels: Record<string, string> = {
  rendah: "Hara rendah",
  sedang: "Hara sedang",
  tinggi: "Hara tinggi",
};

export const areaUnitLabels: Record<string, string> = {
  m2: "m²",
  ha: "ha",
  bedeng: "bedeng",
  pot: "pot",
};

export const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const weekdayShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function formatDateId(value?: string | null) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return `${day} ${monthNames[month - 1]} ${year}`;
}

export function todayIso(timeZone = "Asia/Jakarta") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function addDaysIso(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function greetingForHour(hour: number) {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export function numericOrNull(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
