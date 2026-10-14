"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateId } from "@/lib/labels";

type Test = {
  testDate: string;
  ph: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  organicMatter: number | null;
};

export function SoilChart({ tests }: { tests: Test[] }) {
  const rows = [...tests].sort((a, b) => a.testDate.localeCompare(b.testDate));
  if (rows.length < 2) {
    return (
      <p className="text-sm text-muted">
        Tren ditampilkan jika ada minimal dua hasil tes. Nilai yang tidak diisi tidak dibuat-buat.
      </p>
    );
  }

  const data = rows.map((row) => ({
    tanggal: formatDateId(row.testDate),
    pH: row.ph,
    "Bahan organik": row.organicMatter,
    Nitrogen: row.nitrogen,
  }));

  const hasPh = rows.some((r) => r.ph !== null);
  const hasOm = rows.some((r) => r.organicMatter !== null);
  const hasN = rows.some((r) => r.nitrogen !== null);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e4dac8" strokeDasharray="3 3" />
          <XAxis dataKey="tanggal" tick={{ fontSize: 12, fill: "#6b5e4e" }} />
          <YAxis tick={{ fontSize: 12, fill: "#6b5e4e" }} />
          <Tooltip />
          <Legend />
          {hasPh ? <Line type="monotone" dataKey="pH" stroke="#2f5d3a" strokeWidth={2} connectNulls={false} /> : null}
          {hasOm ? <Line type="monotone" dataKey="Bahan organik" stroke="#c45c32" strokeWidth={2} connectNulls={false} /> : null}
          {hasN ? <Line type="monotone" dataKey="Nitrogen" stroke="#e2b14a" strokeWidth={2} connectNulls={false} /> : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
