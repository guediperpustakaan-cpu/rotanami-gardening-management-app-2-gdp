"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDateId, greetingForHour, plantingStatusLabels } from "@/lib/labels";
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, StatusBadge } from "./ui";

type Dashboard = {
  user: { name: string };
  farm: { id: string; name: string; location: string | null; isDemo: boolean } | null;
  currentSeason: { name: string; startDate: string; endDate: string } | null;
  summary: {
    plotCount: number;
    seasonPlanCount: number;
    plantedPlotCount: number;
    pendingActionCount: number;
  };
  plots: Array<{
    id: string;
    name: string;
    size: number | null;
    areaUnit: string;
    lastPlanting: { cropName: string; status: string; plantDate: string } | null;
  }>;
  upcoming: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
    plotName: string | null;
    status: string;
    href: string;
  }>;
  today: string;
};

const typeLabels: Record<string, string> = {
  pengingat: "Pengingat",
  tanam: "Tanam",
  panen: "Panen",
  rencana: "Rencana",
};

export function DashboardScreen() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Dashboard>("/api/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="text-clay">{error}</p>;
  }
  if (!data) return <Spinner label="Menyiapkan kebun..." />;

  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);

  if (!data.farm) {
    return (
      <EmptyState
        title="Belum ada kebun"
        description="Buat kebun terlebih dahulu. Setelah itu Anda bisa menambah petak, mencatat tanaman, dan merencanakan rotasi."
        action={
          <Link href="/pengaturan">
            <Button>Buat kebun</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={data.farm.isDemo ? "Data contoh" : data.farm.location ?? "Kebun aktif"}
        title={`${greeting}, ${data.user.name.split(" ")[0]}`}
        description={`Kebun aktif: ${data.farm.name}. ${
          data.currentSeason
            ? `Musim berjalan: ${data.currentSeason.name}.`
            : "Belum ada musim yang mencakup hari ini. Anda tetap bisa mencatat tanam dan rencana."
        }`}
        actions={
          <>
            <Link href="/petak?aksi=tambah">
              <Button>Tambah petak</Button>
            </Link>
            <Link href="/petak?aksi=tanam">
              <Button variant="secondary">Catat tanaman</Button>
            </Link>
            <Link href="/rotasi">
              <Button variant="sun">Buat rencana rotasi</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Petak", value: data.summary.plotCount, hint: "Bedeng yang tercatat" },
          { label: "Rencana musim ini", value: data.summary.seasonPlanCount, hint: "Rotasi yang tersimpan" },
          { label: "Sedang ditanami", value: data.summary.plantedPlotCount, hint: "Petak berstatus ditanam" },
          { label: "Perlu perhatian", value: data.summary.pendingActionCount, hint: "Pengingat dan tanam dekat" },
        ].map((item) => (
          <Card key={item.label} className="soil-grain">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{item.label}</p>
            <p className="mt-2 font-display text-4xl text-soil">{item.value}</p>
            <p className="mt-1 text-sm text-muted">{item.hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-soil">Petak kebun</h2>
            <Link className="text-sm font-semibold text-leaf" href="/petak">
              Lihat semua
            </Link>
          </div>
          {data.plots.length === 0 ? (
            <EmptyState
              title="Belum ada petak"
              description="Petak adalah bedeng atau bagian kebun tempat Anda menanam. Mulai dengan satu petak saja."
              action={
                <Link href="/petak?aksi=tambah">
                  <Button>Tambah petak</Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {data.plots.map((plot) => (
                <li key={plot.id}>
                  <Link
                    href={`/petak/${plot.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-mist px-4 py-3 hover:border-leaf/40"
                  >
                    <div>
                      <p className="font-semibold text-soil">{plot.name}</p>
                      <p className="text-sm text-muted">
                        {plot.lastPlanting
                          ? `${plot.lastPlanting.cropName} · ${plantingStatusLabels[plot.lastPlanting.status] ?? plot.lastPlanting.status}`
                          : "Belum ada riwayat"}
                      </p>
                    </div>
                    {plot.lastPlanting ? <StatusBadge status={plot.lastPlanting.status} /> : <Badge tone="mist">Kosong</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-2xl text-soil">Aktivitas berikutnya</h2>
          <p className="mt-1 text-sm text-muted">Pengingat di dalam aplikasi, bukan email atau notifikasi ponsel.</p>
          {data.upcoming.length === 0 ? (
            <p className="mt-6 text-sm text-muted">Belum ada jadwal. Tambahkan pengingat di kalender bila perlu.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.upcoming.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="block rounded-2xl bg-cream px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={item.type === "pengingat" ? "clay" : "leaf"}>{typeLabels[item.type] ?? item.type}</Badge>
                      <span className="text-xs text-muted">{formatDateId(item.date)}</span>
                    </div>
                    <p className="mt-2 font-semibold text-soil">{item.title}</p>
                    <p className="text-sm text-muted">{item.plotName ?? "Kebun"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
