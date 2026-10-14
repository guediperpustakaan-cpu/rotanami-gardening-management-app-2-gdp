import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getActiveFarm } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonOk, parseBody } from "@/lib/http";
import { profileSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const { farm, farms } = await getActiveFarm(user);
    return jsonOk({ user, farm, farms });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, profileSchema);
    const patch: { name?: string; activeFarmId?: string; updatedAt: Date } = { updatedAt: new Date() };
    if (body.name) patch.name = body.name;
    if (body.activeFarmId) {
      const { requireFarmAccess } = await import("@/lib/access");
      await requireFarmAccess(user.id, body.activeFarmId);
      patch.activeFarmId = body.activeFarmId;
    }
    const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
    const nextUser = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      activeFarmId: updated.activeFarmId,
    };
    const { farm, farms } = await getActiveFarm(nextUser);
    return jsonOk({ user: nextUser, farm, farms });
  } catch (error) {
    return handleError(error);
  }
}
