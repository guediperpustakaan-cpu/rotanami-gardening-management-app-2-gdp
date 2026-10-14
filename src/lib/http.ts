import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export function jsonOk<T>(data: T, init?: { status?: number }) {
  return NextResponse.json({ data }, { status: init?.status ?? 200 });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return jsonError(first?.message ?? "Data yang dikirim belum lengkap.", 400);
  }
  if (error instanceof Response) return error;
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return jsonError("Sesi berakhir. Silakan masuk kembali.", 401);
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return jsonError("Anda tidak memiliki akses ke data ini.", 403);
  }
  if (error instanceof Error && error.message === "NOT_FOUND") {
    return jsonError("Data tidak ditemukan.", 404);
  }
  if (error instanceof Error && error.message === "BAD_JSON") {
    return jsonError("Data yang dikirim tidak dapat dibaca.", 400);
  }
  console.error(error);
  return jsonError("Terjadi kesalahan. Coba lagi beberapa saat.", 500);
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("BAD_JSON");
  }
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  try {
    const raw = await request.json();
    return schema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) throw error;
    throw new Error("BAD_JSON");
  }
}
