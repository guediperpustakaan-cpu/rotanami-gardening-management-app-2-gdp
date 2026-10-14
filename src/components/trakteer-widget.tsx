"use client";

import { useState } from "react";
import { Coffee, Copy, Check, Download, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button, Modal } from "@/components/ui";

const TRAKTEER_URL = "https://trakteer.id/perpus_opera/";
const REPO_URL = "https://github.com/guediperpustakaan-cpu/rotanami-gardening-management-app-2-gdp";
const SOURCE_ZIP_URL = `${REPO_URL}/archive/refs/heads/main.zip`;

const TAGLINE = "Web app ini gratis & bebas iklan. Kopi kecil, server tetap jalan.";

// Nominal traktiran: mulai dari Rp6.000 dan kelipatannya.
const NOMINALS = [6000, 12000, 18000, 24000, 36000, 60000];

function formatRupiah(value: number) {
  return "Rp" + value.toLocaleString("id-ID");
}

export function TrakteerWidget() {
  const [open, setOpen] = useState(false);
  const [nominal, setNominal] = useState(NOMINALS[0]);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(TRAKTEER_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.open(TRAKTEER_URL, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Traktir melalui Trakteer"
        className="fixed bottom-20 right-4 z-[60] flex max-w-[17rem] items-center gap-2.5 rounded-full bg-gradient-to-br from-[#ff7a59] to-[#e4572e] px-4 py-3 text-paper shadow-card transition hover:brightness-105 active:scale-[0.98] md:bottom-6 md:right-6"
      >
        <Coffee size={22} className="shrink-0" aria-hidden />
        <span className="text-left text-xs font-semibold leading-tight sm:text-sm">{TAGLINE}</span>
      </button>

      <Modal open={open} title="Traktir secangkir kopi" onClose={() => setOpen(false)}>
        <p className="text-sm leading-6 text-muted">{TAGLINE}</p>

        <div className="mt-5">
          <p className="text-sm font-semibold text-soil">Pilih nominal traktiran</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {NOMINALS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setNominal(value)}
                aria-pressed={nominal === value}
                className={
                  nominal === value
                    ? "rounded-2xl border border-clay bg-clay/10 px-2 py-3 text-sm font-semibold text-clay transition"
                    : "rounded-2xl border border-mist bg-paper px-2 py-3 text-sm font-semibold text-soil transition hover:border-soil/30"
                }
              >
                {formatRupiah(value)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            Pilihan cepat. Jumlah akhir tetap bisa kamu sesuaikan di halaman Trakteer — {TAGLINE.toLowerCase()}
          </p>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl border border-mist bg-cream/60 p-4">
          <p className="text-sm font-semibold text-soil">Traktiran terpilih: {formatRupiah(nominal)}</p>
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <QRCodeSVG value={TRAKTEER_URL} size={176} bgColor="#ffffff" fgColor="#241c14" level="M" marginSize={2} aria-label="QR code halaman Trakteer" />
          </div>
          <p className="text-center text-xs leading-5 text-muted">
            Scan QR ini dengan kamera ponsel, atau salin dan buka linknya. Tidak perlu pindah halaman: pembayaran
            selesai di Trakteer, kamu tetap di sini.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a href={TRAKTEER_URL} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button className="w-full">
              <ExternalLink size={16} aria-hidden /> Buka Trakteer
            </Button>
          </a>
          <Button variant="secondary" type="button" onClick={copyLink} className="flex-1">
            {copied ? (
              <>
                <Check size={16} aria-hidden /> Link disalin
              </>
            ) : (
              <>
                <Copy size={16} aria-hidden /> Salin link
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 border-t border-mist pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted">Source code lengkap web app ini tersedia publik di GitHub.</p>
            <a href={SOURCE_ZIP_URL} className="shrink-0">
              <Button variant="secondary">
                <Download size={16} aria-hidden /> Download source code
              </Button>
            </a>
          </div>
          <p className="mt-4 text-center text-xs font-semibold text-muted">Open Source oleh MZF - 2026</p>
        </div>
      </Modal>
    </>
  );
}
