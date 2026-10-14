"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/client";
import { loginSchema } from "@/lib/validations";
import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/toast";

type FormValues = { email: string; password: string };

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setBusy(true);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify(values) });
      toast("Selamat datang kembali.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal masuk", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-3">
        <img src="/brand/logo.png" alt="" className="h-12 w-12 rounded-2xl object-cover" />
        <span className="font-display text-3xl text-soil">Rotanami</span>
      </Link>
      <h1 className="font-display text-4xl text-soil">Masuk</h1>
      <p className="mt-2 text-sm text-muted">Gunakan akun Anda atau coba data contoh di bawah.</p>
      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label="Kata sandi" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...form.register("password")} />
        </Field>
        <Button className="w-full" type="submit" disabled={busy}>
          {busy ? "Memeriksa..." : "Masuk"}
        </Button>
      </form>
      <div className="mt-6 rounded-3xl bg-paper p-4 text-sm leading-6 text-muted">
        <p className="font-semibold text-soil">Akun data contoh</p>
        <p>Email: demo@rotanami.local</p>
        <p>Kata sandi: KebunDemo123</p>
      </div>
      <p className="mt-6 text-sm text-muted">
        Belum punya akun?{" "}
        <Link className="font-semibold text-leaf" href="/daftar">
          Daftar
        </Link>
      </p>
    </main>
  );
}
