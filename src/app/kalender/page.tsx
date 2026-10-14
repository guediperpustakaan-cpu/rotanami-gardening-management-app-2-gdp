"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AppShell } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Textarea } from "@/components/ui";
import { api } from "@/lib/client";
import { formatDateId, monthNames, todayIso, weekdayShort } from "@/lib/labels";

type Reminder = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  notes: string | null;
  plotId: string | null;
  plotName: string | null;
};
type Planting = { id: string; cropName: string; plotName: string; plantDate: string; harvestDate: string | null; status: string };
type Plan = { id: string; cropName: string; plotName: string; startDate: string; status: string };
type Plot = { id: string; name: string };

type CalItem = {
  id: string;
  date: string;
  title: string;
  kind: string;
  status: string;
  href?: string;
};

export default function CalendarPage() {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const form = useForm({ defaultValues: { title: "", dueDate: todayIso(), plotId: "", notes: "" } });

  async function load() {
    const [reminderRows, plantingRows, planRows, plotRows] = await Promise.all([
      api<Reminder[]>("/api/reminders"),
      api<Planting[]>("/api/plantings"),
      api<Plan[]>("/api/rotation-plans"),
      api<Plot[]>("/api/plots"),
    ]);
    setReminders(reminderRows);
    setPlantings(plantingRows);
    setPlans(planRows);
    setPlots(plotRows);
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

  const items: CalItem[] = useMemo(() => {
    const list: CalItem[] = [];
    for (const reminder of reminders ?? []) {
      list.push({
        id: reminder.id,
        date: reminder.dueDate,
        title: reminder.title,
        kind: "pengingat",
        status: reminder.status,
      });
    }
    for (const planting of plantings) {
      list.push({
        id: `tanam-${planting.id}`,
        date: planting.plantDate,
        title: `Tanam ${planting.cropName} · ${planting.plotName}`,
        kind: "tanam",
        status: planting.status,
      });
      if (planting.harvestDate) {
        list.push({
          id: `panen-${planting.id}`,
          date: planting.harvestDate,
          title: `Panen ${planting.cropName} · ${planting.plotName}`,
          kind: "panen",
          status: planting.status,
        });
      }
    }
    for (const plan of plans) {
      list.push({
        id: `rencana-${plan.id}`,
        date: plan.startDate,
        title: `Rencana ${plan.cropName} · ${plan.plotName}`,
        kind: "rencana",
        status: plan.status,
      });
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [reminders, plantings, plans]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const start = first.getDay();
    const days = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const blanks = Array.from({ length: start }, () => null);
    const dates = Array.from({ length: days }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      const month = String(cursor.month + 1).padStart(2, "0");
      return `${cursor.year}-${month}-${day}`;
    });
    return [...blanks, ...dates];
  }, [cursor]);

  async function saveReminder(values: { title: string; dueDate: string; plotId: string; notes: string }) {
    setBusy(true);
    try {
      await api("/api/reminders", {
        method: "POST",
        body: JSON.stringify({
          title: values.title,
          dueDate: values.dueDate,
          plotId: values.plotId || undefined,
          notes: values.notes,
        }),
      });
      toast("Pengingat disimpan. Pengingat hanya tampil di aplikasi.");
      setOpen(false);
      form.reset({ title: "", dueDate: todayIso(), plotId: "", notes: "" });
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleReminder(reminder: Reminder) {
    await api(`/api/reminders/${reminder.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: reminder.status === "selesai" ? "belum" : "selesai" }),
    });
    await load();
  }

  const monthItems = items.filter((item) => item.date.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`));

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          eyebrow="Jadwal"
          title="Kalender kebun"
          description="Gabungan rencana tanam, panen, rotasi, dan pengingat. Tidak ada email atau notifikasi push pada versi ini."
          actions={<Button onClick={() => setOpen(true)}>Tambah pengingat</Button>}
        />

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <Button variant="secondary" onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}>
              Bulan sebelumnya
            </Button>
            <p className="font-display text-2xl text-soil">
              {monthNames[cursor.month]} {cursor.year}
            </p>
            <Button variant="secondary" onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}>
              Bulan berikutnya
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
            {weekdayShort.map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, index) => {
              if (!iso) return <div key={`b-${index}`} className="min-h-16 rounded-xl bg-transparent" />;
              const dayItems = items.filter((item) => item.date === iso);
              const isToday = iso === todayIso();
              return (
                <div key={iso} className={`min-h-16 rounded-xl border p-1 ${isToday ? "border-leaf bg-leaf/5" : "border-mist bg-paper"}`}>
                  <p className="text-xs font-semibold text-soil">{Number(iso.slice(-2))}</p>
                  {dayItems.slice(0, 2).map((item) => (
                    <p key={item.id} className="truncate text-[10px] text-muted">
                      {item.title}
                    </p>
                  ))}
                  {dayItems.length > 2 ? <p className="text-[10px] text-clay">+{dayItems.length - 2}</p> : null}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-2xl text-soil">Daftar bulan ini</h2>
          {!reminders ? (
            <Spinner />
          ) : monthItems.length === 0 ? (
            <EmptyState title="Tidak ada jadwal bulan ini" description="Tambahkan pengingat atau catat rencana tanam agar muncul di sini." />
          ) : (
            <ul className="mt-4 space-y-3">
              {monthItems.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream px-4 py-3">
                  <div>
                    <p className="font-semibold text-soil">{item.title}</p>
                    <p className="text-sm text-muted">{formatDateId(item.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{item.kind}</Badge>
                    <StatusBadge status={item.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-2xl text-soil">Pengingat</h2>
          <ul className="mt-4 space-y-3">
            {(reminders ?? []).map((reminder) => (
              <li key={reminder.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-mist p-4">
                <div>
                  <p className="font-semibold text-soil">{reminder.title}</p>
                  <p className="text-sm text-muted">
                    {formatDateId(reminder.dueDate)}
                    {reminder.plotName ? ` · ${reminder.plotName}` : ""}
                  </p>
                </div>
                <Button variant={reminder.status === "selesai" ? "secondary" : "primary"} className="min-h-10 text-xs" onClick={() => toggleReminder(reminder)}>
                  {reminder.status === "selesai" ? "Tandai belum" : "Tandai selesai"}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Modal open={open} title="Pengingat baru" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={form.handleSubmit(saveReminder)}>
          <Field label="Judul">
            <Input {...form.register("title")} />
          </Field>
          <Field label="Tanggal">
            <Input type="date" {...form.register("dueDate")} />
          </Field>
          <Field label="Petak" hint="Opsional">
            <Select {...form.register("plotId")}>
              <option value="">Tidak terkait petak</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Catatan">
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
