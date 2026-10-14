"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AppShell } from "@/components/app-shell";
import { SoilChart } from "@/components/soil-chart";
import { useToast } from "@/components/toast";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { api } from "@/lib/client";
import { areaUnitLabels, formatDateId, observationCategoryLabels } from "@/lib/labels";

type Detail = {
  plot: {
    id: string;
    name: string;
    size: number | null;
    areaUnit: string;
    soilType: string | null;
    notes: string | null;
  };
  farm: { name: string; isDemo: boolean };
  plantings: Array<{
    id: string;
    cropId: string;
    cropName: string;
    cropIsDemo: boolean;
    plantDate: string;
    harvestDate: string | null;
    status: string;
    yieldAmount: number | null;
    yieldUnit: string | null;
    notes: string | null;
  }>;
  soilTests: Array<{
    id: string;
    testDate: string;
    ph: number | null;
    nitrogen: number | null;
    phosphorus: number | null;
    potassium: number | null;
    organicMatter: number | null;
    method: string | null;
    notes: string | null;
  }>;
  observations: Array<{
    id: string;
    category: string;
    observedAt: string;
    description: string;
    plantingId: string | null;
  }>;
  rotationPlans: Array<{ id: string; cropName: string; status: string; startDate: string; notes: string | null }>;
};

type Crop = { id: string; commonName: string; isDemo: boolean };
type Tab = "ringkasan" | "riwayat" | "tanah" | "observasi";

export default function PlotDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [tab, setTab] = useState<Tab>("ringkasan");
  const [editOpen, setEditOpen] = useState(false);
  const [plantingOpen, setPlantingOpen] = useState(false);
  const [soilOpen, setSoilOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ type: string; id: string } | null>(null);

  const editForm = useForm({ defaultValues: { name: "", size: "", areaUnit: "m2", soilType: "", notes: "" } });
  const plantingForm = useForm({
    defaultValues: {
      cropId: "",
      plantDate: "",
      harvestDate: "",
      status: "ditanam",
      yieldAmount: "",
      yieldUnit: "",
      notes: "",
    },
  });
  const soilForm = useForm({
    defaultValues: {
      testDate: "",
      ph: "",
      nitrogen: "",
      phosphorus: "",
      potassium: "",
      organicMatter: "",
      method: "",
      notes: "",
    },
  });
  const obsForm = useForm({
    defaultValues: { category: "lain", observedAt: "", description: "", plantingId: "" },
  });

  async function load() {
    const [detail, cropRows] = await Promise.all([
      api<Detail>(`/api/plots/${params.id}`),
      api<Crop[]>("/api/crops"),
    ]);
    setData(detail);
    setCrops(cropRows);
    editForm.reset({
      name: detail.plot.name,
      size: detail.plot.size?.toString() ?? "",
      areaUnit: detail.plot.areaUnit,
      soilType: detail.plot.soilType ?? "",
      notes: detail.plot.notes ?? "",
    });
  }

  useEffect(() => {
    load().catch((error) => toast(error.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function savePlot(values: { name: string; size: string; areaUnit: string; soilType: string; notes: string }) {
    setBusy(true);
    try {
      await api(`/api/plots/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: values.name,
          size: values.size === "" ? undefined : Number(values.size),
          areaUnit: values.areaUnit,
          soilType: values.soilType,
          notes: values.notes,
        }),
      });
      toast("Petak diperbarui.");
      setEditOpen(false);
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  async function savePlanting(values: {
    cropId: string;
    plantDate: string;
    harvestDate: string;
    status: string;
    yieldAmount: string;
    yieldUnit: string;
    notes: string;
  }) {
    setBusy(true);
    try {
      const payload = {
        plotId: params.id,
        cropId: values.cropId,
        plantDate: values.plantDate,
        harvestDate: values.harvestDate || undefined,
        status: values.status,
        yieldAmount: values.yieldAmount === "" ? undefined : Number(values.yieldAmount),
        yieldUnit: values.yieldUnit || undefined,
        notes: values.notes,
      };
      if (editingPlanting) {
        await api(`/api/plantings/${editingPlanting}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/plantings", { method: "POST", body: JSON.stringify(payload) });
      }
      toast("Riwayat tanam disimpan.");
      setPlantingOpen(false);
      setEditingPlanting(null);
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveSoil(values: Record<string, string>) {
    setBusy(true);
    try {
      await api("/api/soil-tests", {
        method: "POST",
        body: JSON.stringify({
          plotId: params.id,
          testDate: values.testDate,
          ph: values.ph === "" ? undefined : Number(values.ph),
          nitrogen: values.nitrogen === "" ? undefined : Number(values.nitrogen),
          phosphorus: values.phosphorus === "" ? undefined : Number(values.phosphorus),
          potassium: values.potassium === "" ? undefined : Number(values.potassium),
          organicMatter: values.organicMatter === "" ? undefined : Number(values.organicMatter),
          method: values.method,
          notes: values.notes,
        }),
      });
      toast("Hasil tes tanah disimpan.");
      setSoilOpen(false);
      soilForm.reset();
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveObs(values: { category: string; observedAt: string; description: string; plantingId: string }) {
    setBusy(true);
    try {
      await api("/api/observations", {
        method: "POST",
        body: JSON.stringify({
          plotId: params.id,
          category: values.category,
          observedAt: values.observedAt,
          description: values.description,
          plantingId: values.plantingId || undefined,
        }),
      });
      toast("Observasi disimpan.");
      setObsOpen(false);
      obsForm.reset({ category: "lain", observedAt: "", description: "", plantingId: "" });
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete && deleteOpen) {
      setBusy(true);
      try {
        await api(`/api/plots/${params.id}?confirm=true`, {
          method: "DELETE",
          body: JSON.stringify({ confirmName }),
        });
        toast("Petak dihapus.");
        router.replace("/petak");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Gagal menghapus", "error");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const path =
        pendingDelete.type === "planting"
          ? `/api/plantings/${pendingDelete.id}?confirm=true`
          : pendingDelete.type === "soil"
            ? `/api/soil-tests/${pendingDelete.id}?confirm=true`
            : `/api/observations/${pendingDelete.id}?confirm=true`;
      await api(path, { method: "DELETE" });
      toast("Data dihapus.");
      setPendingDelete(null);
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal menghapus", "error");
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "ringkasan", label: "Ringkasan" },
    { id: "riwayat", label: "Riwayat tanam" },
    { id: "tanah", label: "Kesehatan tanah" },
    { id: "observasi", label: "Observasi" },
  ];

  return (
    <AppShell>
      {!data ? (
        <Spinner />
      ) : (
        <div className="space-y-5">
          <PageHeader
            eyebrow={data.farm.name}
            title={data.plot.name}
            description={`${data.plot.size ? `${data.plot.size} ${areaUnitLabels[data.plot.areaUnit] ?? data.plot.areaUnit}` : "Luas belum diisi"}${
              data.plot.soilType ? ` · ${data.plot.soilType}` : " · jenis tanah belum diisi"
            }`}
            actions={
              <>
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  Ubah petak
                </Button>
                <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                  Hapus petak
                </Button>
              </>
            }
          />

          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Bagian petak">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
                  tab === item.id ? "bg-leaf text-paper" : "bg-paper text-soil"
                }`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "ringkasan" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h2 className="font-display text-2xl text-soil">Catatan petak</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{data.plot.notes || "Belum ada catatan."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/rotasi">
                    <Button variant="sun">Rencana rotasi</Button>
                  </Link>
                  <Button variant="secondary" onClick={() => setPlantingOpen(true)}>
                    Catat tanaman
                  </Button>
                </div>
              </Card>
              <Card>
                <h2 className="font-display text-2xl text-soil">Tanaman terakhir</h2>
                {data.plantings[0] ? (
                  <div className="mt-3">
                    <p className="text-lg font-semibold text-soil">
                      {data.plantings[0].cropName}
                      {data.plantings[0].cropIsDemo ? <Badge tone="sun">Data contoh</Badge> : null}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={data.plantings[0].status} />
                    </div>
                    <p className="mt-2 text-sm text-muted">Ditanam {formatDateId(data.plantings[0].plantDate)}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">Belum ada riwayat.</p>
                )}
                {data.rotationPlans[0] ? (
                  <p className="mt-4 text-sm text-muted">
                    Rencana berikutnya: {data.rotationPlans[0].cropName} ({formatDateId(data.rotationPlans[0].startDate)})
                  </p>
                ) : null}
              </Card>
            </div>
          )}

          {tab === "riwayat" && (
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl text-soil">Riwayat tanam</h2>
                <Button onClick={() => { setEditingPlanting(null); plantingForm.reset(); setPlantingOpen(true); }}>
                  Tambah
                </Button>
              </div>
              {data.plantings.length === 0 ? (
                <EmptyState title="Belum ada riwayat" description="Catat tanaman yang direncanakan, sedang ditanam, atau sudah dipanen." />
              ) : (
                <ul className="space-y-3">
                  {data.plantings.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-mist p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-soil">
                            {item.cropName} {item.cropIsDemo ? <Badge tone="sun">Data contoh</Badge> : null}
                          </p>
                          <p className="text-sm text-muted">
                            Tanam {formatDateId(item.plantDate)}
                            {item.harvestDate ? ` · panen ${formatDateId(item.harvestDate)}` : ""}
                          </p>
                          {item.yieldAmount ? (
                            <p className="text-sm text-muted">
                              Hasil: {item.yieldAmount} {item.yieldUnit}
                            </p>
                          ) : null}
                          {item.notes ? <p className="mt-1 text-sm text-muted">{item.notes}</p> : null}
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="secondary"
                          className="min-h-10 px-3 text-xs"
                          onClick={() => {
                            setEditingPlanting(item.id);
                            plantingForm.reset({
                              cropId: item.cropId,
                              plantDate: item.plantDate,
                              harvestDate: item.harvestDate ?? "",
                              status: item.status,
                              yieldAmount: item.yieldAmount?.toString() ?? "",
                              yieldUnit: item.yieldUnit ?? "",
                              notes: item.notes ?? "",
                            });
                            setPlantingOpen(true);
                          }}
                        >
                          Ubah
                        </Button>
                        <Button variant="ghost" className="min-h-10 px-3 text-xs text-clay" onClick={() => setPendingDelete({ type: "planting", id: item.id })}>
                          Hapus
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === "tanah" && (
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl text-soil">Kesehatan tanah</h2>
                  <p className="text-sm text-muted">Hanya menampilkan angka yang Anda isi. Bukan diagnosis pemupukan.</p>
                </div>
                <Button onClick={() => setSoilOpen(true)}>Catat tes</Button>
              </div>
              <SoilChart tests={data.soilTests} />
              {data.soilTests.length === 0 ? (
                <EmptyState title="Belum ada tes tanah" description="Tanggal tes dan petak wajib. pH, N, P, K, dan bahan organik bersifat opsional." />
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.soilTests.map((test) => (
                    <li key={test.id} className="rounded-2xl bg-cream p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-soil">{formatDateId(test.testDate)}</p>
                        <Button variant="ghost" className="min-h-10 text-xs text-clay" onClick={() => setPendingDelete({ type: "soil", id: test.id })}>
                          Hapus
                        </Button>
                      </div>
                      <p className="mt-2 text-sm text-muted">{test.method || "Metode belum diisi"}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                        {[
                          ["pH", test.ph],
                          ["N", test.nitrogen],
                          ["P", test.phosphorus],
                          ["K", test.potassium],
                          ["BO", test.organicMatter],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="rounded-xl bg-paper px-3 py-2">
                            <dt className="text-xs text-muted">{label}</dt>
                            <dd className="font-semibold text-soil">{value ?? "—"}</dd>
                          </div>
                        ))}
                      </dl>
                      {test.notes ? <p className="mt-2 text-sm text-muted">{test.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === "observasi" && (
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl text-soil">Observasi</h2>
                <Button onClick={() => setObsOpen(true)}>Tambah observasi</Button>
              </div>
              {data.observations.length === 0 ? (
                <EmptyState title="Belum ada observasi" description="Catat hama, penyakit, pertumbuhan, cuaca, atau catatan lain per petak." />
              ) : (
                <ul className="space-y-3">
                  {data.observations.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-mist p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge>{observationCategoryLabels[item.category] ?? item.category}</Badge>
                          <p className="mt-2 text-sm text-muted">{formatDateId(item.observedAt)}</p>
                          <p className="mt-1 text-sm leading-6 text-soil">{item.description}</p>
                        </div>
                        <Button variant="ghost" className="min-h-10 text-xs text-clay" onClick={() => setPendingDelete({ type: "obs", id: item.id })}>
                          Hapus
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}

      <Modal open={editOpen} title="Ubah petak" onClose={() => setEditOpen(false)}>
        <form className="space-y-3" onSubmit={editForm.handleSubmit(savePlot)}>
          <Field label="Nama">
            <Input {...editForm.register("name")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ukuran">
              <Input {...editForm.register("size")} />
            </Field>
            <Field label="Satuan">
              <Select {...editForm.register("areaUnit")}>
                <option value="m2">m²</option>
                <option value="ha">ha</option>
                <option value="bedeng">bedeng</option>
                <option value="pot">pot</option>
              </Select>
            </Field>
          </div>
          <Field label="Jenis tanah">
            <Input {...editForm.register("soilType")} />
          </Field>
          <Field label="Catatan">
            <Textarea {...editForm.register("notes")} />
          </Field>
          <Button className="w-full" disabled={busy}>
            Simpan
          </Button>
        </form>
      </Modal>

      <Modal open={plantingOpen} title={editingPlanting ? "Ubah riwayat tanam" : "Catat tanaman"} onClose={() => setPlantingOpen(false)}>
        <form className="space-y-3" onSubmit={plantingForm.handleSubmit(savePlanting)}>
          <Field label="Tanaman">
            <Select {...plantingForm.register("cropId")}>
              <option value="">Pilih tanaman</option>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.commonName}
                  {crop.isDemo ? " (data contoh)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal tanam">
            <Input type="date" {...plantingForm.register("plantDate")} />
          </Field>
          <Field label="Tanggal panen" hint="Opsional">
            <Input type="date" {...plantingForm.register("harvestDate")} />
          </Field>
          <Field label="Status">
            <Select {...plantingForm.register("status")}>
              <option value="direncanakan">Direncanakan</option>
              <option value="ditanam">Ditanam</option>
              <option value="dipanen">Dipanen</option>
              <option value="dibatalkan">Dibatalkan</option>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Hasil panen" hint="Opsional">
              <Input {...plantingForm.register("yieldAmount")} />
            </Field>
            <Field label="Satuan">
              <Input {...plantingForm.register("yieldUnit")} placeholder="kg, ikat, buah" />
            </Field>
          </div>
          <Field label="Catatan">
            <Textarea {...plantingForm.register("notes")} />
          </Field>
          <Button className="w-full" disabled={busy}>
            Simpan
          </Button>
        </form>
      </Modal>

      <Modal open={soilOpen} title="Catat tes tanah" onClose={() => setSoilOpen(false)}>
        <form className="space-y-3" onSubmit={soilForm.handleSubmit(saveSoil)}>
          <Field label="Tanggal tes">
            <Input type="date" {...soilForm.register("testDate")} />
          </Field>
          <Field label="Metode atau sumber" hint="Contoh: kit kebun, laboratorium setempat.">
            <Input {...soilForm.register("method")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="pH">
              <Input {...soilForm.register("ph")} />
            </Field>
            <Field label="Bahan organik">
              <Input {...soilForm.register("organicMatter")} />
            </Field>
            <Field label="Nitrogen">
              <Input {...soilForm.register("nitrogen")} />
            </Field>
            <Field label="Fosfor">
              <Input {...soilForm.register("phosphorus")} />
            </Field>
            <Field label="Kalium">
              <Input {...soilForm.register("potassium")} />
            </Field>
          </div>
          <Field label="Catatan">
            <Textarea {...soilForm.register("notes")} />
          </Field>
          <Button className="w-full" disabled={busy}>
            Simpan
          </Button>
        </form>
      </Modal>

      <Modal open={obsOpen} title="Tambah observasi" onClose={() => setObsOpen(false)}>
        <form className="space-y-3" onSubmit={obsForm.handleSubmit(saveObs)}>
          <Field label="Jenis">
            <Select {...obsForm.register("category")}>
              <option value="hama">Hama</option>
              <option value="penyakit">Penyakit</option>
              <option value="pertumbuhan">Pertumbuhan</option>
              <option value="cuaca">Cuaca</option>
              <option value="lain">Catatan lain</option>
            </Select>
          </Field>
          <Field label="Tanggal">
            <Input type="date" {...obsForm.register("observedAt")} />
          </Field>
          <Field label="Tautkan ke siklus tanam" hint="Opsional">
            <Select {...obsForm.register("plantingId")}>
              <option value="">Tidak ditautkan</option>
              {data?.plantings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.cropName} · {formatDateId(item.plantDate)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Deskripsi">
            <Textarea {...obsForm.register("description")} />
          </Field>
          <Button className="w-full" disabled={busy}>
            Simpan
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus petak?"
        description="Riwayat tanam, tes tanah, observasi, dan rencana di petak ini akan ikut terhapus. Tindakan ini tidak bisa dibatalkan."
        extra={
          <Field label="Ketik nama petak untuk konfirmasi">
            <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
          </Field>
        }
        busy={busy}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Hapus catatan ini?"
        description="Data yang dihapus tidak bisa dikembalikan."
        busy={busy}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </AppShell>
  );
}
