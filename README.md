# Rotanami

Rotanami adalah aplikasi web berbahasa Indonesia untuk pekebun rumahan, kebun komunitas, dan petani skala kecil. Pengguna dapat mencatat petak, riwayat tanam, rencana rotasi, hasil uji tanah, observasi, dan pengingat.

Nama **Rotanami** adalah nama kerja untuk proyek ini. Nama ini tidak diklaim unik secara global, bebas merek dagang, atau tersedia sebagai domain.

## Catatan lingkungan

Lingkungan kerja ini memakai **Next.js (App Router) + API Route + Drizzle ORM + PostgreSQL**. Itu setara secara fungsional dengan frontend React + backend Node.js, tetapi tidak memakai Vite dan Express terpisah agar aplikasi dapat dijalankan di sandbox ini.

Koneksi database kompatibel dengan **Neon PostgreSQL**: backend membaca `DATABASE_URL` (dan SSL bila diperlukan). String koneksi tidak pernah dikirim ke bundel frontend.

Autentikasi sungguhan memakai hash kata sandi (scrypt) dan cookie sesi **HttpOnly**. Token tidak disimpan di `localStorage`.

## Fitur yang sudah berfungsi

- Pendaftaran, masuk, dan keluar dengan sesi server
- Dashboard kebun aktif, ringkasan petak, dan aktivitas berikutnya
- Profil kebun, beberapa kebun per akun, anggota kebun (pemilik)
- Petak/bedeng: tambah, ubah, hapus dengan konfirmasi nama
- Katalog tanaman di database (bisa dicari/difilter); data contoh berlabel jelas
- Riwayat tanam per petak, termasuk ubah dan hapus
- Perencana rotasi berbasis aturan yang transparan dan dapat diuji
- Kalender/daftar rencana, tanam, panen, dan pengingat dalam aplikasi
- Catatan tes tanah (nilai opsional) plus tren sederhana bila ada dua hasil atau lebih
- Observasi hama, penyakit, pertumbuhan, cuaca, atau catatan lain
- Ekspor CSV riwayat tanam dan tes tanah

## Keterbatasan

- Pengingat hanya tampil di dalam aplikasi. Tidak ada email atau push notification.
- Saran rotasi adalah panduan umum, bukan diagnosis atau kepastian agronomi.
- Tidak ada ekspor PDF (sengaja, agar tidak menampilkan tombol yang tidak berfungsi).
- Tidak ada fitur berbayar atau iklan.

## Prasyarat

- Node.js 20+
- PostgreSQL (lokal atau Neon)

## Environment variable

Salin `.env.example` menjadi `.env`:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
DATABASE_SSL=true
```

Untuk PostgreSQL lokal tanpa SSL:

```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
DATABASE_SSL=false
```

Jangan menaruh kredensial di frontend.

## Cara menjalankan

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). `npm run db:push` menjalankan `drizzle-kit push` dan `npm run db:seed` menjalankan `tsx src/db/seed.ts`; keduanya membaca `DATABASE_URL` dari `.env`.

## Deploy ke Vercel + Neon

1. Buat project di Vercel dan import repositori ini.
2. Di **Settings → Environment Variables**, tambahkan:
   - `DATABASE_URL` — connection string Neon (mis. `postgresql://...?sslmode=require`)
   - `DATABASE_SSL` — `true`
3. Deploy. Semua API route memakai `force-dynamic`, jadi build tidak membutuhkan koneksi database.
4. Pastikan skema dan data contoh sudah ada di database Neon sebelum deploy pertama:

```bash
DATABASE_URL=<connection-string-neon> DATABASE_SSL=true npm run db:push
DATABASE_URL=<connection-string-neon> DATABASE_SSL=true npm run db:seed
```


Perintah lain:

```bash
npx vitest run
npx next build
```

## Akun data contoh

- Email: `demo@rotanami.local`
- Kata sandi: `KebunDemo123`

Semua angka dan riwayat pada akun ini berlabel **Data contoh**.

## Aturan rotasi (versi awal)

1. Membaca riwayat tanam petak (mengabaikan yang dibatalkan).
2. Menyelingi keluarga botani / kelompok rotasi bila datanya ada.
3. Mempertimbangkan observasi hama/penyakit yang tertaut ke siklus tanam.
4. Memakai kategori hara dan penanda tanaman penutup tanah hanya jika terisi.
5. Jika data kurang, menampilkan “Data belum cukup untuk memberi saran yang lebih spesifik” dan tetap mengizinkan pilihan manual.

Logika ini ada di `src/lib/rotation.ts` dan diuji di `src/lib/rotation.test.ts`.

## API singkat

Semua endpoint (kecuali masuk/daftar dan `/api/health`) memerlukan sesi. Respons sukses: `{ "data": ... }`. Galat: `{ "error": "pesan bahasa Indonesia" }`.

| Metode | Jalur | Fungsi |
| --- | --- | --- |
| POST | `/api/auth/register` | Daftar |
| POST | `/api/auth/login` | Masuk |
| POST | `/api/auth/logout` | Keluar |
| GET/PATCH | `/api/auth/me` | Profil dan kebun aktif |
| GET/POST | `/api/farms` | Daftar / buat kebun |
| PATCH/DELETE | `/api/farms/:id` | Ubah / hapus kebun (konfirmasi nama) |
| GET/POST | `/api/plots` | Petak |
| GET/PATCH/DELETE | `/api/plots/:id` | Detail petak |
| GET/POST | `/api/crops` | Katalog |
| GET/POST | `/api/plant-families` | Keluarga tanaman |
| GET/POST | `/api/seasons` | Musim |
| GET/POST | `/api/plantings` | Riwayat tanam |
| GET/POST | `/api/soil-tests` | Tes tanah |
| GET/POST | `/api/observations` | Observasi |
| POST | `/api/rotation/suggest` | Saran rotasi |
| GET/POST | `/api/rotation-plans` | Rencana rotasi |
| GET/POST | `/api/reminders` | Pengingat |
| GET | `/api/dashboard` | Ringkasan beranda |
| GET | `/api/export/plantings` | CSV riwayat tanam |
| GET | `/api/export/soil-tests` | CSV tes tanah |

## Default yang dipilih

- Zona waktu awal: `Asia/Jakarta`
- Satuan luas awal: `m²`
- Penghapusan kebun/petak memakai `ON DELETE RESTRICT` di database, lalu dihapus berurutan di aplikasi setelah konfirmasi
- Katalog contoh bersifat baca-saja; pengguna menambah tanaman sendiri untuk kebunnya
