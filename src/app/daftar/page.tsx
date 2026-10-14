"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/client";
import { registerSchema } from "@/lib/validations";
import { Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/toast";

type FormValues = { name: string; email: string; password: string };

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setBusy(true);
    try {
      await api("/api/auth/register", { method: "POST", body: JSON.stringify(values) });
      toast("Akun dan kebun pertama sudah siap.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal mendaftar", "error");
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
      <h1 className="font-display text-4xl text-soil">Buat akun</h1>
      <p className="mt-2 text-sm text-muted">Kebun kosong akan dibuat otomatis. Anda bisa menambah petak setelahnya.</p>
      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <Field label="Nama" error={form.formState.errors.name?.message}>
          <Input autoComplete="name" {...form.register("name")} />
        </Field>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label="Kata sandi" hint="Minimal 8 karakter." error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        <Button className="w-full" type="submit" disabled={busy}>
          {busy ? "Menyimpan..." : "Daftar"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Sudah punya akun?{" "}
        <Link className="font-semibold text-leaf" href="/masuk">
          Masuk
        </Link>
      </p>
    </main>
  );
}
