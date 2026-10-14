import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { attachSessionCookie, createSession, verifyPassword } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { loginSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, loginSchema);
    const email = body.email.toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return jsonError("Email atau kata sandi tidak sesuai.", 401);
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      return jsonError("Email atau kata sandi tidak sesuai.", 401);
    }
    const session = await createSession(user.id);
    const response = jsonOk({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        activeFarmId: user.activeFarmId,
      },
    });
    return attachSessionCookie(response, session.id);
  } catch (error) {
    return handleError(error);
  }
}
