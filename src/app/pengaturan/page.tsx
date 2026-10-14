"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { Button, Card, ConfirmDialog, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { api } from "@/lib/client";
import { formatDateId } from "@/lib/labels";

type Farm = {
  id: string;
  name: string;
  location: string | null;
  timezone: string;
  notes: string | null;
  isDemo: boolean;
};
type Me = { user: { name: string; email: string }; farm: Farm | null; farms: Farm[] };
type Season = { id: string; name: string; startDate: string; endDate: string; notes: string | null };

export default function SettingsPage() {
  const { toast } = useToast();
  const [me, setMe] = useState<Me | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const profileForm = useForm({ defaultValues: { name: "" } });
  const farmForm = useForm({ defaultValues: { name: "", location: "", timezone: "Asia/Jakarta", notes: "" } });
  const newFarmForm = useForm({ defaultValues: { name: "", location: "", timezone: "Asia/Jakarta" } });
  const seasonForm = useForm({ defaultValues: { name: "", startDate: "", endDate: "", notes: "" } });

  async function load() {
    const data = await api<Me>("/api/auth/me");
    setMe(data);
    profileForm.reset({ name: data.user.name });
    if (data.farm) {
      farmForm.reset({
        name: data.farm.name,
        location: data.farm.location ?? "",
        timezone: data.farm.timezone,
        notes: data.farm.notes ?? "",
      });
    }
    const seasonRows = await api<Season[]>("/api/seasons");
    setSeasons(seasonRows);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(values: { name: string }) {
    setBusy(true);
    try {
      await api("/api/auth/me", { method: "PATCH", body: JSON.stringify(values) });
      toast("Profil disimpan.");
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveFarm(values: { name: string; location: string; timezone: string; notes: string }) {
    if (!me?.farm) return;
    setBusy(true);
    try {
      await api(`/api/farms/${me.farm.id}`, { method: "PATCH", body: JSON.stringify(values) });
      toast("Profil kebun disimpan.");
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  async function createFarm(values: { name: string; location: string; timezone: string }) {
    setBusy(true);
    try {
      const farm = await api<Farm>("/api/farms", { method: "POST", body: JSON.stringify(values) });
      await api("/api/auth/me", { method: "PATCH", body: JSON.stringify({ activeFarmId: farm.id }) });
      toast("Kebun baru dibuat dan dijadikan kebun aktif.");
      newFarmForm.reset();
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveSeason(values: { name: string; startDate: string; endDate: string; notes: string }) {
    setBusy(true);
    try {
      await api("/api/seasons", { method: "POST", body: JSON.stringify(values) });
      toast("Musim disimpan.");
      seasonForm.reset();
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!me) {
    return (
      <AppShell>
        <Spinner />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Pengaturan"
          title="Kebun dan profil"
          description="Data dipisah per akun. Kata sandi disimpan terenkripsi, sesi memakai cookie HttpOnly."
        />

        <Card>
          <h2 className="font-display text-2xl text-soil">Profil pengguna</h2>
          <p className="mt-1 text-sm text-muted">{me.user.email}</p>
          <form className="mt-4 max-w-lg space-y-3" onSubmit={profileForm.handleSubmit(saveProfile)}>
            <Field label="Nama">
              <Input {...profileForm.register("name")} />
            </Field>
            <Button disabled={busy}>Simpan profil</Button>
          </form>
        </Card>

        {me.farm ? (
          <Card>
            <h2 className="font-display text-2xl text-soil">Kebun aktif</h2>
            {me.farm.isDemo ? <p className="mt-1 text-sm text-clay">Ini kebun data contoh.</p> : null}
            <form className="mt-4 max-w-lg space-y-3" onSubmit={farmForm.handleSubmit(saveFarm)}>
              <Field label="Nama kebun">
                <Input {...farmForm.register("name")} />
              </Field>
              <Field label="Lokasi" hint="Teks bebas, misalnya nama kampung atau kota.">
                <Input {...farmForm.register("location")} />
              </Field>
              <Field label="Zona waktu">
                <Select {...farmForm.register("timezone")}>
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                </Select>
              </Field>
              <Field label="Catatan">
                <Textarea {...farmForm.register("notes")} />
              </Field>
              <Button disabled={busy}>Simpan kebun</Button>
            </form>
          </Card>
        ) : (
          <Card>
            <h2 className="font-display text-2xl text-soil">Belum ada kebun</h2>
            <p className="mt-2 text-sm text-muted">Buat kebun untuk mulai menambah petak.</p>
          </Card>
        )}

        <Card>
          <h2 className="font-display text-2xl text-soil">Buat kebun lain</h2>
          <form className="mt-4 max-w-lg space-y-3" onSubmit={newFarmForm.handleSubmit(createFarm)}>
            <Field label="Nama kebun">
              <Input {...newFarmForm.register("name")} />
            </Field>
            <Field label="Lokasi">
              <Input {...newFarmForm.register("location")} />
            </Field>
            <Button variant="secondary" disabled={busy}>
              Tambah kebun
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="font-display text-2xl text-soil">Musim</h2>
          <p className="mt-1 text-sm text-muted">Musim adalah rentang tanggal yang Anda tentukan sendiri, bukan kalender iklim resmi.</p>
          <form className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2" onSubmit={seasonForm.handleSubmit(saveSeason)}>
            <Field label="Nama musim">
              <Input {...seasonForm.register("name")} />
            </Field>
            <div />
            <Field label="Mulai">
              <Input type="date" {...seasonForm.register("startDate")} />
            </Field>
            <Field label="Selesai">
              <Input type="date" {...seasonForm.register("endDate")} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Catatan">
                <Textarea {...seasonForm.register("notes")} />
              </Field>
            </div>
            <Button disabled={busy}>Simpan musim</Button>
          </form>
          <ul className="mt-4 space-y-2">
            {seasons.map((season) => (
              <li key={season.id} className="rounded-2xl bg-cream px-4 py-3 text-sm">
                <p className="font-semibold text-soil">{season.name}</p>
                <p className="text-muted">
                  {formatDateId(season.startDate)} — {formatDateId(season.endDate)}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-display text-2xl text-soil">Ekspor CSV</h2>
          <p className="mt-1 text-sm text-muted">Unduh catatan kebun aktif. Ekspor PDF tidak disediakan pada versi ini.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="inline-flex min-h-12 items-center rounded-2xl bg-leaf px-4 text-sm font-semibold text-paper" href="/api/export/plantings">
              Unduh riwayat tanam
            </a>
            <a className="inline-flex min-h-12 items-center rounded-2xl border border-mist bg-paper px-4 text-sm font-semibold text-soil" href="/api/export/soil-tests">
              Unduh tes tanah
            </a>
          </div>
        </Card>

        {me.farm ? (
          <Card>
            <h2 className="font-display text-2xl text-clay">Hapus kebun aktif</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Semua petak, riwayat, tes tanah, observasi, dan rencana di kebun ini akan dihapus. Ketik nama kebun untuk konfirmasi.
            </p>
            <Button variant="danger" className="mt-4" onClick={() => setDeleteOpen(true)}>
              Hapus kebun
            </Button>
          </Card>
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus kebun?"
        description="Tindakan ini permanen. Data kebun lain pada akun Anda tidak ikut terhapus."
        extra={
          <Field label="Ketik nama kebun">
            <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
          </Field>
        }
        busy={busy}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!me.farm) return;
          setBusy(true);
          try {
            await api(`/api/farms/${me.farm.id}`, { method: "DELETE", body: JSON.stringify({ confirmName }) });
            toast("Kebun dihapus.");
            setDeleteOpen(false);
            await load();
          } catch (error) {
            toast(error instanceof Error ? error.message : "Gagal", "error");
          } finally {
            setBusy(false);
          }
        }}
      />
    </AppShell>
  );
}
