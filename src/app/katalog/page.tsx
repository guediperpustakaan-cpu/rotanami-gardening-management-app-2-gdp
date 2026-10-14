"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { api } from "@/lib/client";
import { nutrientNeedLabels } from "@/lib/labels";

type Crop = {
  id: string;
  commonName: string;
  scientificName: string | null;
  familyId: string | null;
  familyName: string | null;
  rotationGroup: string | null;
  nutrientNeed: string | null;
  isCoverCrop: boolean;
  notes: string | null;
  isDemo: boolean;
  farmId: string | null;
};

type Family = { id: string; name: string; rotationGroup: string | null; isDemo: boolean };

export default function CatalogPage() {
  const { toast } = useToast();
  const [crops, setCrops] = useState<Crop[] | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [q, setQ] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [coverOnly, setCoverOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Crop | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm({
    defaultValues: {
      commonName: "",
      scientificName: "",
      familyId: "",
      nutrientNeed: "",
      isCoverCrop: false,
      notes: "",
    },
  });

  async function load() {
    const [cropRows, familyRows] = await Promise.all([api<Crop[]>("/api/crops"), api<Family[]>("/api/plant-families")]);
    setCrops(cropRows);
    setFamilies(familyRows);
  }

  useEffect(() => {
    load().catch((error) => toast(error.message, "error"));
  }, [toast]);

  const filtered = useMemo(() => {
    return (crops ?? []).filter((crop) => {
      const hay = `${crop.commonName} ${crop.scientificName ?? ""} ${crop.familyName ?? ""}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (familyFilter && crop.familyId !== familyFilter) return false;
      if (coverOnly && !crop.isCoverCrop) return false;
      return true;
    });
  }, [crops, q, familyFilter, coverOnly]);

  function startCreate() {
    setEditing(null);
    form.reset({ commonName: "", scientificName: "", familyId: "", nutrientNeed: "", isCoverCrop: false, notes: "" });
    setOpen(true);
  }

  function startEdit(crop: Crop) {
    setEditing(crop);
    form.reset({
      commonName: crop.commonName,
      scientificName: crop.scientificName ?? "",
      familyId: crop.familyId ?? "",
      nutrientNeed: crop.nutrientNeed ?? "",
      isCoverCrop: crop.isCoverCrop,
      notes: crop.notes ?? "",
    });
    setOpen(true);
  }

  async function save(values: {
    commonName: string;
    scientificName: string;
    familyId: string;
    nutrientNeed: string;
    isCoverCrop: boolean;
    notes: string;
  }) {
    setBusy(true);
    try {
      const payload = {
        commonName: values.commonName,
        scientificName: values.scientificName,
        familyId: values.familyId || undefined,
        nutrientNeed: values.nutrientNeed || undefined,
        isCoverCrop: values.isCoverCrop,
        notes: values.notes,
      };
      if (editing) {
        await api(`/api/crops/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/crops", { method: "POST", body: JSON.stringify(payload) });
      }
      toast("Tanaman disimpan.");
      setOpen(false);
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          eyebrow="Katalog"
          title="Tanaman"
          description="Daftar ini tersimpan di database, bukan dikunci di tampilan. Tanaman bertanda data contoh bisa dipakai, tetapi tidak diubah."
          actions={<Button onClick={startCreate}>Tambah tanaman</Button>}
        />

        <Card>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Cari">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama atau keluarga" />
            </Field>
            <Field label="Keluarga">
              <Select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}>
                <option value="">Semua</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-soil">
              <input type="checkbox" checked={coverOnly} onChange={(e) => setCoverOnly(e.target.checked)} />
              Hanya tanaman penutup tanah
            </label>
          </div>
        </Card>

        {!crops ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada tanaman" description="Ubah filter atau tambahkan tanaman ke katalog kebun Anda." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((crop) => (
              <Card key={crop.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl text-soil">{crop.commonName}</h2>
                    <p className="text-sm italic text-muted">{crop.scientificName || "Nama ilmiah belum diisi"}</p>
                  </div>
                  {crop.isDemo ? <Badge tone="sun">Data contoh</Badge> : <Badge tone="leaf">Kebun Anda</Badge>}
                </div>
                <p className="mt-3 text-sm text-muted">
                  {crop.familyName ?? "Keluarga belum diisi"}
                  {crop.rotationGroup ? ` · ${crop.rotationGroup}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {crop.nutrientNeed ? <Badge>{nutrientNeedLabels[crop.nutrientNeed]}</Badge> : null}
                  {crop.isCoverCrop ? <Badge tone="leaf">Penutup tanah</Badge> : null}
                </div>
                {crop.notes ? <p className="mt-3 text-sm leading-6 text-muted">{crop.notes}</p> : null}
                {!crop.isDemo ? (
                  <Button variant="secondary" className="mt-4 min-h-10" onClick={() => startEdit(crop)}>
                    Ubah
                  </Button>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} title={editing ? "Ubah tanaman" : "Tambah tanaman"} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={form.handleSubmit(save)}>
          <Field label="Nama umum">
            <Input {...form.register("commonName")} />
          </Field>
          <Field label="Nama ilmiah" hint="Opsional">
            <Input {...form.register("scientificName")} />
          </Field>
          <Field label="Keluarga botani">
            <Select {...form.register("familyId")}>
              <option value="">Belum diisi</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kebutuhan hara" hint="Isi hanya jika Anda punya acuan.">
            <Select {...form.register("nutrientNeed")}>
              <option value="">Belum diisi</option>
              <option value="rendah">Rendah</option>
              <option value="sedang">Sedang</option>
              <option value="tinggi">Tinggi</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-soil">
            <input type="checkbox" {...form.register("isCoverCrop")} />
            Tanaman penutup tanah
          </label>
          <Field label="Catatan panduan umum">
            <Textarea {...form.register("notes")} />
          </Field>
          <Button className="w-full" disabled={busy}>
            Simpan
          </Button>
        </form>
      </Modal>
    </AppShell>
  );
}
