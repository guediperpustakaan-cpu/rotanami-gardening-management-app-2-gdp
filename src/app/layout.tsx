import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rotanami — catatan kebun dan rotasi tanaman",
  description:
    "Aplikasi berbahasa Indonesia untuk mencatat petak kebun, riwayat tanam, rencana rotasi, dan hasil uji tanah.",
  icons: { icon: "/brand/logo.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className={`${nunito.variable} ${fraunces.variable} font-sans antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
