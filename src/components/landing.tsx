import Link from "next/link";

export function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-3">
          <img src="/brand/logo.png" alt="" className="h-12 w-12 rounded-2xl object-cover" />
          <div>
            <p className="font-display text-2xl text-soil">Rotanami</p>
            <p className="text-xs text-muted">Nama kerja untuk proyek ini</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-2xl px-4 py-3 text-sm font-semibold text-soil" href="/masuk">
            Masuk
          </Link>
          <Link className="rounded-2xl bg-leaf px-4 py-3 text-sm font-semibold text-paper" href="/daftar">
            Buat akun
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16">
        <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Catatan kebun rumahan</p>
            <h1 className="mt-3 font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-[1.05] text-soil">
              Catat petak, rencanakan rotasi, tanam lagi.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              Rotanami membantu pekebun rumahan, kebun komunitas, dan petani skala kecil menyimpan riwayat tanam,
              hasil tes tanah, dan rencana musim — tanpa mengklaim diagnosis agronomi.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link className="rounded-2xl bg-leaf px-5 py-3 text-center text-sm font-semibold text-paper" href="/daftar">
                Mulai kebun saya
              </Link>
              <Link className="rounded-2xl border border-mist bg-paper px-5 py-3 text-center text-sm font-semibold text-soil" href="/masuk">
                Coba data contoh
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] shadow-card">
            <img
              src="/images/hero-garden.jpg"
              alt="Petak kebun rumahan dengan sayuran dan jalur bata di pagi hari"
              className="h-full w-full object-cover"
            />
          </div>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Petak yang mudah dipahami",
              body: "Setiap bedeng punya nama, ukuran, dan riwayat tanam. Tidak perlu istilah rumit untuk mulai.",
            },
            {
              title: "Saran rotasi yang transparan",
              body: "Saran disusun dari keluarga tanaman dan catatan Anda. Jika data kurang, aplikasi mengatakannya dengan jujur.",
            },
            {
              title: "Tes tanah apa adanya",
              body: "Isi hanya angka yang Anda punya. Nilai kosong tetap kosong — tidak dilengkapi oleh sistem.",
            },
          ].map((item) => (
            <article key={item.title} className="paper-card rounded-3xl p-5">
              <h2 className="font-display text-2xl text-soil">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 overflow-hidden rounded-[2rem] bg-leaf-deep text-paper md:grid md:grid-cols-2">
          <img src="/images/soil-hands.jpg" alt="Tangan memegang tanah gembur dan bibit" className="h-56 w-full object-cover md:h-full" />
          <div className="p-6 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sun">Bukan resep pupuk</p>
            <h2 className="mt-2 font-display text-3xl">Panduan umum, bukan kepastian.</h2>
            <p className="mt-3 text-sm leading-7 text-paper/80">
              Rotanami menyimpan catatan Anda dan menampilkan alasan di balik saran rotasi. Keputusan tetap di kebun,
              disesuaikan dengan musim dan kondisi setempat.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
