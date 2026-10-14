"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Textarea } from "@/components/ui";
import { api } from "@/lib/client";
import { areaUnitLabels, formatDateId } from "@/lib/labels";
import { plantingSchema, plotSchema } from "@/lib/validations";

type Plot = {
  id: string;
  name: string;
  size: number | null;
  areaUnit: string;
  soilType: string | null;
  lastPlanting: { cropName?: string; status: string; plantDate: string } | null;
};

type Crop = { id: string; commonName: string; isDemo: boolean };

function PetakInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [plots, setPlots] = useState<Plot[] | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [plotOpen, setPlotOpen] = useState(false);
  const [plantOpen, setPlantOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const plotForm = useForm({
    resolver: zodResolver(plotSchema),
    defaultValues: { name: "", size: undefined, areaUnit: "m2" as const, soilType: "", notes: "" },
  });
  const plantForm = useForm({
    resolver: zodResolver(plantingSchema),
    defaultValues: { plotId: "", cropId: "", plantDate: "", status: "ditanam" as const, notes: "" },
  });

  async function load() {
    const [plotRows, cropRows] = await Promise.all([api<Plot[]>("/api/plots"), api<Crop[]>("/api/crops")]);
    setPlots(plotRows);
    setCrops(cropRows);
  }

  useEffect(() => {
    const run = async () => {
      try {
        await load();
      } catch (error) {
        toast(error instanceof Error ? error.message : "Gagal memuat data", "error");
      }
    };
    void run();
  }, [toast]);

  const plotModalOpen = plotOpen || params.get("aksi") === "tambah";
  const plantModalOpen = plantOpen || params.get("aksi") === "tanam";

  const cropOptions = useMemo(() => crops, [crops]);

  async function savePlot(values: { name: string; size?: number; areaUnit?: "m2" | "ha" | "bedeng" | "pot"; soilType?: string; notes?: string }) {
    setBusy(true);
    try {
      await api("/api/plots", { method: "POST", body: JSON.stringify(values) });
      toast("Petak disimpan.");
      setPlotOpen(false);
      plotForm.reset();
      router.replace("/petak");
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal menyimpan", "error");
    } finally {
      setBusy(false);
    }
  }

  async function savePlanting(values: Record<string, unknown>) {
    setBusy(true);
    try {
      await api("/api/plantings", { method: "POST", body: JSON.stringify(values) });
      toast("Riwayat tanam disimpan.");
      setPlantOpen(false);
      plantForm.reset({ plotId: "", cropId: "", plantDate: "", status: "ditanam", notes: "" });
      router.replace("/petak");
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal menyimpan", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kebun"
        title="Petak dan bedeng"
        description="Setiap petak menyimpan riwayat tanam sendiri. Hapus petak hanya setelah konfirmasi nama."
        actions={
          <>
            <Button onClick={() => setPlotOpen(true)}>Tambah petak</Button>
            <Button variant="secondary" onClick={() => setPlantOpen(true)}>
              Catat tanaman
            </Button>
          </>
        }
      />

      {!plots ? (
        <Spinner />
      ) : plots.length === 0 ? (
        <EmptyState
          title="Belum ada petak"
          description="Buat satu petak untuk mulai mencatat. Nama boleh sederhana, misalnya Bedeng depan."
          action={<Button onClick={() => setPlotOpen(true)}>Tambah petak</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {plots.map((plot) => (
            <Link key={plot.id} href={`/petak/${plot.id}`}>
              <Card className="h-full transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl text-soil">{plot.name}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {plot.size ? `${plot.size} ${areaUnitLabels[plot.areaUnit] ?? plot.areaUnit}` : "Luas belum diisi"}
                      {plot.soilType ? ` · ${plot.soilType}` : ""}
                    </p>
                  </div>
                  {plot.lastPlanting ? <StatusBadge status={plot.lastPlanting.status} /> : <Badge tone="mist">Belum ada riwayat</Badge>}
                </div>
                <p className="mt-4 text-sm text-muted">
                  {plot.lastPlanting
                    ? `Terakhir: ${plot.lastPlanting.cropName ?? "tanaman"} · ${formatDateId(plot.lastPlanting.plantDate)}`
                    : "Belum ada tanaman yang tercatat di petak ini."}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={plotModalOpen}
        title="Tambah petak"
        onClose={() => {
          setPlotOpen(false);
          router.replace("/petak");
        }}
      >
        <form className="space-y-3" onSubmit={plotForm.handleSubmit(savePlot)}>
          <Field label="Nama petak" error={plotForm.formState.errors.name?.message}>
            <Input {...plotForm.register("name")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ukuran" hint="Opsional">
              <Input type="number" step="0.01" {...plotForm.register("size", { valueAsNumber: true })} />
            </Field>
            <Field label="Satuan">
              <Select {...plotForm.register("areaUnit")}>
                <option value="m2">m²</option>
                <option value="ha">ha</option>
                <option value="bedeng">bedeng</option>
                <option value="pot">pot</option>
              </Select>
            </Field>
          </div>
          <Field label="Jenis tanah" hint="Isi hanya jika Anda tahu.">
            <Input {...plotForm.register("soilType")} />
          </Field>
          <Field label="Catatan">
            <Textarea {...plotForm.register("notes")} />
          </Field>
          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Menyimpan..." : "Simpan petak"}
          </Button>
        </form>
      </Modal>

      <Modal
        open={plantModalOpen}
        title="Catat tanaman"
        onClose={() => {
          setPlantOpen(false);
          router.replace("/petak");
        }}
      >
        {(!plots || plots.length === 0) && (
          <p className="mb-3 text-sm text-clay">Tambah petak dulu sebelum mencatat tanaman.</p>
        )}
        <form className="space-y-3" onSubmit={plantForm.handleSubmit(savePlanting)}>
          <Field label="Petak" error={plantForm.formState.errors.plotId?.message}>
            <Select {...plantForm.register("plotId")}>
              <option value="">Pilih petak</option>
              {plots?.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanaman" error={plantForm.formState.errors.cropId?.message}>
            <Select {...plantForm.register("cropId")}>
              <option value="">Pilih tanaman</option>
              {cropOptions.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.commonName}
                  {crop.isDemo ? " (data contoh)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal tanam" error={plantForm.formState.errors.plantDate?.message}>
            <Input type="date" {...plantForm.register("plantDate")} />
          </Field>
          <Field label="Status">
            <Select {...plantForm.register("status")}>
              <option value="direncanakan">Direncanakan</option>
              <option value="ditanam">Ditanam</option>
              <option value="dipanen">Dipanen</option>
              <option value="dibatalkan">Dibatalkan</option>
            </Select>
          </Field>
          <Field label="Catatan">
            <Textarea {...plantForm.register("notes")} />
          </Field>
          <Button className="w-full" type="submit" disabled={busy || !plots?.length}>
            {busy ? "Menyimpan..." : "Simpan catatan"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default function PetakPage() {
  return (
    <AppShell>
      <Suspense fallback={<Spinner />}>
        <PetakInner />
      </Suspense>
    </AppShell>
  );
}
