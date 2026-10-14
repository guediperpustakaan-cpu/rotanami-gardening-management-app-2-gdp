import { eq } from "drizzle-orm";
import { db } from "@/db";
import { farmMembers, farms, users } from "@/db/schema";
import { attachSessionCookie, createSession, hashPassword } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { registerSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, registerSchema);
    const email = body.email.toLowerCase();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return jsonError("Email sudah terdaftar. Silakan masuk atau gunakan email lain.", 409);
    }

    const passwordHash = await hashPassword(body.password);
    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ name: body.name, email, passwordHash })
        .returning();
      const [farm] = await tx
        .insert(farms)
        .values({
          ownerId: user.id,
          name: "Kebun saya",
          timezone: "Asia/Jakarta",
        })
        .returning();
      await tx.insert(farmMembers).values({ farmId: farm.id, userId: user.id, role: "pemilik" });
      await tx.update(users).set({ activeFarmId: farm.id }).where(eq(users.id, user.id));
      return { user, farm };
    });

    const session = await createSession(result.user.id);
    const response = jsonOk(
      {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          activeFarmId: result.farm.id,
        },
      },
      { status: 201 },
    );
    return attachSessionCookie(response, session.id);
  } catch (error) {
    return handleError(error);
  }
}
