"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "sun";
}) {
  const styles = {
    primary: "bg-leaf text-paper hover:bg-leaf-deep",
    secondary: "bg-paper text-soil border border-mist hover:border-soil/30",
    ghost: "bg-transparent text-soil hover:bg-mist/60",
    danger: "bg-clay text-paper hover:bg-[#a84b28]",
    sun: "bg-sun text-ink hover:bg-[#d4a33d]",
  } as const;
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("paper-card rounded-3xl p-5 sm:p-6", className)}>{children}</section>;
}

const fieldClass =
  "w-full rounded-2xl border border-mist bg-paper px-3 py-3 text-base text-ink placeholder:text-muted/70 disabled:opacity-60";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-soil">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-muted">{hint}</span> : null}
      {error ? (
        <span className="block text-sm text-clay" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, props.className)} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, "min-h-28", props.className)} {...props} />;
}

export function Badge({
  children,
  tone = "soil",
}: {
  children: ReactNode;
  tone?: "soil" | "leaf" | "clay" | "sun" | "mist";
}) {
  const tones = {
    soil: "bg-soil/10 text-soil",
    leaf: "bg-leaf/10 text-leaf-deep",
    clay: "bg-clay/15 text-clay",
    sun: "bg-sun/30 text-soil",
    mist: "bg-mist text-muted",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: "soil" | "leaf" | "clay" | "sun" | "mist" }> = {
    direncanakan: { label: "Direncanakan", tone: "sun" },
    ditanam: { label: "Ditanam", tone: "leaf" },
    dipanen: { label: "Dipanen", tone: "soil" },
    dibatalkan: { label: "Dibatalkan", tone: "mist" },
    aktif: { label: "Aktif", tone: "leaf" },
    selesai: { label: "Selesai", tone: "soil" },
    belum: { label: "Belum dilakukan", tone: "clay" },
  };
  const item = map[status] ?? { label: status, tone: "mist" as const };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-soil/20 bg-paper/70 px-5 py-10 text-center">
      <p className="font-display text-2xl text-soil">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button className="absolute inset-0 bg-ink/40" aria-label="Tutup dialog" onClick={onClose} type="button" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-card sm:max-w-lg sm:rounded-3xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="modal-title" className="font-display text-2xl text-soil">
            {title}
          </h2>
          <button type="button" className="rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-mist" onClick={onClose}>
            Tutup
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Ya, hapus",
  extra,
  onConfirm,
  onClose,
  busy,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  extra?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm leading-6 text-muted">{description}</p>
      {extra}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" type="button" onClick={onClose}>
          Batal
        </Button>
        <Button variant="danger" type="button" onClick={onConfirm} disabled={busy}>
          {busy ? "Menghapus..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">{eyebrow}</p> : null}
        <h1 className="mt-1 font-display text-3xl text-soil sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Spinner({ label = "Memuat..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-mist border-t-leaf" />
      <span>{label}</span>
    </div>
  );
}
