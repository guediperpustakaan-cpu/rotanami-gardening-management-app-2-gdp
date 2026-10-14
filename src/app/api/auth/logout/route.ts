import { clearSessionCookie, destroyCurrentSession } from "@/lib/auth";
import { handleError, jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await destroyCurrentSession();
    return clearSessionCookie(jsonOk({ ok: true }));
  } catch (error) {
    return handleError(error);
  }
}
