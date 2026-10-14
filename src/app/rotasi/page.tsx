"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, PageHeader, Select, Spinner, StatusBadge, Textarea } from "@/components/ui";
import { api } from "@/lib/client";
import { formatDateId } from "@/lib/labels";

type Plot = { id: string; name: string };
type Crop = { id: string; commonName: string; isDemo: boolean; familyName: string | null };
type Season = { id: string; name: string; startDate: string; endDate: string };
type Suggestion = {
  cropId: string;
  commonName: string;
  familyName: string | null;
  rank: "utama" | "alternatif";
  reasons: Array<{ code: string; text: string }>;
};
type SuggestResult = {
  plot: { id: string; name: string };
  suggestions: Suggestion[];
  insufficientData: boolean;
  summary: string;
  limitations: string[];
  usedData: string[];
  lastPlanting: { cropName: string; familyName: string | null; plantDate: string; status: string } | null;
};
type Plan = {
  id: string;
  plotId: string;
  cropId: string;
  cropName: string;
  plotName: string;
  seasonName: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  reasons: Array<{ code: string; text: string }>;
  notes: string | null;
};

export default function RotationPage() {
  const { toast } = useToast();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [plotId, setPlotId] = useState("");
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { cropId: "", seasonId: "", startDate: "", endDate: "", notes: "" },
  });

  async function load() {
    const [plotRows, cropRows, seasonRows, planRows] = await Promise.all([
      api<Plot[]>("/api/plots"),
      api<Crop[]>("/api/crops"),
      api<Season[]>("/api/seasons"),
      api<Plan[]>("/api/rotation-plans"),
    ]);
    setPlots(plotRows);
    setCrops(cropRows);
    setSeasons(seasonRows);
    setPlans(planRows);
    if (!plotId && plotRows[0]) setPlotId(plotRows[0].id);
  }

  useEffect(() => {
    load().catch((error) => toast(error.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function suggest() {
    if (!plotId) return;
    setBusy(true);
    try {
      const data = await api<SuggestResult>("/api/rotation/suggest", {
        method: "POST",
        body: JSON.stringify({ plotId }),
      });
      setResult(data);
      if (data.suggestions[0]) form.setValue("cropId", data.suggestions[0].cropId);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  async function savePlan(values: { cropId: string; seasonId: string; startDate: string; endDate: string; notes: string }) {
    setBusy(true);
    try {
      const chosen = result?.suggestions.find((s) => s.cropId === values.cropId);
      await api("/api/rotation-plans", {
        method: "POST",
        body: JSON.stringify({
          plotId,
          cropId: values.cropId,
          seasonId: values.seasonId || undefined,
          startDate: values.startDate,
          endDate: values.endDate || undefined,
          notes: values.notes,
          reasons: chosen?.reasons ?? [{ code: "manual", text: "Tanaman dipilih secara manual oleh pengguna." }],
        }),
      });
      toast("Rencana rotasi disimpan.");
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await api(`/api/rotation-plans/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    toast("Status rencana diperbarui.");
    await load();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Perencana"
          title="Rotasi tanaman"
          description="Saran disusun dari riwayat petak dan katalog. Ini panduan umum, bukan diagnosis atau kepastian hasil."
        />

        {plots.length === 0 ? (
          <EmptyState title="Belum ada petak" description="Tambah petak terlebih dahulu sebelum merencanakan rotasi." />
        ) : (
          <Card>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Field label="Petak">
                <Select value={plotId} onChange={(e) => setPlotId(e.target.value)}>
                  {plots.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex items-end">
                <Button className="w-full md:w-auto" onClick={suggest} disabled={busy}>
                  {busy ? "Menyusun saran..." : "Minta saran"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {result ? (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              {result.insufficientData ? (
                <div className="mb-4 rounded-2xl bg-sun/30 px-4 py-3 text-sm text-soil">
                  Data belum cukup untuk memberi saran yang lebih spesifik. Anda tetap bisa memilih tanaman secara manual.
                </div>
              ) : null}
              <h2 className="font-display text-2xl text-soil">Saran untuk {result.plot.name}</h2>
              {result.lastPlanting ? (
                <p className="mt-2 text-sm text-muted">
                  Tanaman terakhir: {result.lastPlanting.cropName}
                  {result.lastPlanting.familyName ? ` (${result.lastPlanting.familyName})` : ""} · {formatDateId(result.lastPlanting.plantDate)}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">Belum ada riwayat tanam di petak ini.</p>
              )}
              <p className="mt-3 text-sm leading-6 text-muted">{result.summary}</p>
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Data yang dipakai</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-muted">
                  {result.usedData.length ? result.usedData.map((item) => <li key={item}>{item}</li>) : <li>Belum ada data pendukung</li>}
                </ul>
              </div>
              <div className="mt-4 space-y-3">
                {result.suggestions.map((item) => (
                  <button
                    key={item.cropId}
                    type="button"
                    className="w-full rounded-2xl border border-mist p-4 text-left hover:border-leaf"
                    onClick={() => form.setValue("cropId", item.cropId)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-soil">{item.commonName}</p>
                      <Badge tone={item.rank === "utama" ? "leaf" : "mist"}>{item.rank === "utama" ? "Saran utama" : "Alternatif"}</Badge>
                    </div>
                    <p className="text-sm text-muted">{item.familyName ?? "Keluarga belum diisi"}</p>
                    <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-muted">
                      {item.reasons.map((reason) => (
                        <li key={reason.code}>{reason.text}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-cream p-4 text-xs leading-5 text-muted">
                {result.limitations.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="font-display text-2xl text-soil">Simpan rencana</h2>
              <p className="mt-1 text-sm text-muted">Pilih saran atau tanaman lain dari katalog.</p>
              <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(savePlan)}>
                <Field label="Tanaman">
                  <Select {...form.register("cropId")}>
                    <option value="">Pilih tanaman</option>
                    {crops.map((crop) => (
                      <option key={crop.id} value={crop.id}>
                        {crop.commonName}
                        {crop.isDemo ? " (data contoh)" : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Musim" hint="Opsional">
                  <Select {...form.register("seasonId")}>
                    <option value="">Tanpa musim</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tanggal mulai">
                  <Input type="date" {...form.register("startDate")} />
                </Field>
                <Field label="Tanggal selesai" hint="Opsional">
                  <Input type="date" {...form.register("endDate")} />
                </Field>
                <Field label="Catatan">
                  <Textarea {...form.register("notes")} />
                </Field>
                <Button className="w-full" disabled={busy}>
                  Simpan rencana
                </Button>
              </form>
            </Card>
          </div>
        ) : null}

        <Card>
          <h2 className="font-display text-2xl text-soil">Rencana tersimpan</h2>
          {!plans ? (
            <Spinner />
          ) : plans.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Belum ada rencana rotasi.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {plans.map((plan) => (
                <li key={plan.id} className="rounded-2xl border border-mist p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-soil">
                        {plan.cropName} · {plan.plotName}
                      </p>
                      <p className="text-sm text-muted">
                        {formatDateId(plan.startDate)}
                        {plan.seasonName ? ` · ${plan.seasonName}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={plan.status} />
                  </div>
                  {plan.reasons?.length ? (
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                      {plan.reasons.map((reason) => (
                        <li key={reason.code}>{reason.text}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.status !== "dibatalkan" && plan.status !== "selesai" ? (
                      <>
                        <Button variant="secondary" className="min-h-10 text-xs" onClick={() => setStatus(plan.id, "aktif")}>
                          Tandai aktif
                        </Button>
                        <Button variant="secondary" className="min-h-10 text-xs" onClick={() => setStatus(plan.id, "selesai")}>
                          Selesai
                        </Button>
                        <Button variant="ghost" className="min-h-10 text-xs text-clay" onClick={() => setStatus(plan.id, "dibatalkan")}>
                          Batalkan
                        </Button>
                      </>
                    ) : null}
                    <Button variant="ghost" className="min-h-10 text-xs text-clay" onClick={() => setPending(plan.id)}>
                      Hapus
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        title="Hapus rencana?"
        description="Rencana yang dihapus tidak bisa dikembalikan."
        onClose={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          await api(`/api/rotation-plans/${pending}?confirm=true`, { method: "DELETE" });
          setPending(null);
          toast("Rencana dihapus.");
          await load();
        }}
      />
    </AppShell>
  );
}
