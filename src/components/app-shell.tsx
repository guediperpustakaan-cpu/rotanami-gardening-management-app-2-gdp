"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Home, Leaf, Map, Settings2, Sprout } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import { Button, cn } from "./ui";
import { useToast } from "./toast";

type Farm = {
  id: string;
  name: string;
  location: string | null;
  timezone: string;
  isDemo: boolean;
};

type Me = {
  user: { id: string; name: string; email: string; activeFarmId: string | null };
  farm: Farm | null;
  farms: Farm[];
};

const nav = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/petak", label: "Petak", icon: Map },
  { href: "/katalog", label: "Katalog", icon: Sprout },
  { href: "/rotasi", label: "Rotasi", icon: Leaf },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [me, setMe] = useState<Me | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then(setMe)
      .catch((error) => {
        if (error.status === 401) router.replace("/masuk");
      });
  }, [router, pathname]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    toast("Anda sudah keluar.", "info");
    router.replace("/masuk");
  }

  async function switchFarm(farmId: string) {
    const next = await api<Me>("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ activeFarmId: farmId }),
    });
    setMe(next);
    toast(`Kebun aktif: ${next.farm?.name ?? "berubah"}`);
    router.refresh();
  }

  const primaryMobile = nav.filter((item) => ["/", "/petak", "/rotasi", "/kalender"].includes(item.href));

  return (
    <div className="min-h-screen md:grid md:grid-cols-[17.5rem_1fr]">
      <aside className="hidden border-r border-mist bg-paper/80 md:flex md:flex-col">
        <div className="flex items-center gap-3 px-5 py-6">
          <img src="/brand/logo.png" alt="" className="h-12 w-12 rounded-2xl object-cover" />
          <div>
            <p className="font-display text-2xl text-soil">Rotanami</p>
            <p className="text-xs text-muted">Catat, rencanakan, tanam lagi</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Menu utama">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold",
                  active ? "bg-leaf text-paper" : "text-soil hover:bg-mist/70",
                )}
              >
                <Icon size={18} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3 p-4">
          {me?.farms && me.farms.length > 1 ? (
            <label className="block text-xs font-semibold text-muted">
              Kebun aktif
              <select
                className="mt-1 w-full rounded-2xl border border-mist bg-paper px-3 py-2 text-sm text-ink"
                value={me.farm?.id ?? ""}
                onChange={(e) => switchFarm(e.target.value)}
              >
                {me.farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-muted">{me?.farm?.name ?? "Belum ada kebun"}</p>
          )}
          <p className="text-sm font-semibold text-soil">{me?.user.name}</p>
          <Button variant="secondary" className="w-full" onClick={logout}>
            Keluar
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-mist/80 bg-cream/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <img src="/brand/logo.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-display text-xl text-soil">Rotanami</span>
          </Link>
          <button type="button" className="rounded-2xl px-3 py-2 text-sm font-semibold text-soil" onClick={() => setMoreOpen(true)}>
            Lainnya
          </button>
        </header>

        {me?.farm?.isDemo ? (
          <div className="bg-sun/40 px-4 py-2 text-center text-sm text-soil">
            Anda sedang melihat <strong>data contoh</strong>. Angka dan riwayat ini bukan kebun sungguhan.
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-10">{children}</main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-mist bg-paper/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
          aria-label="Navigasi bawah"
        >
          {primaryMobile.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center rounded-2xl text-[11px] font-semibold",
                  active ? "bg-leaf/10 text-leaf-deep" : "text-muted",
                )}
              >
                <Icon size={18} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-ink/40" aria-label="Tutup menu" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-paper p-5 pb-10">
            <p className="font-display text-2xl text-soil">Menu lain</p>
            <div className="mt-4 grid gap-2">
              <Link className="rounded-2xl bg-mist/50 px-4 py-3 font-semibold text-soil" href="/katalog" onClick={() => setMoreOpen(false)}>
                Katalog tanaman
              </Link>
              <Link className="rounded-2xl bg-mist/50 px-4 py-3 font-semibold text-soil" href="/pengaturan" onClick={() => setMoreOpen(false)}>
                Pengaturan kebun
              </Link>
              <button className="rounded-2xl px-4 py-3 text-left font-semibold text-clay" onClick={logout} type="button">
                Keluar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
