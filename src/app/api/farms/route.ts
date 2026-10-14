import { db } from "@/db";
import { farmMembers, farms } from "@/db/schema";
import { listAccessibleFarms } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonOk, parseBody } from "@/lib/http";
import { farmSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await listAccessibleFarms(user.id);
    return jsonOk(items);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, farmSchema);
    const farm = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(farms)
        .values({
          ownerId: user.id,
          name: body.name,
          location: body.location,
          timezone: body.timezone ?? "Asia/Jakarta",
          notes: body.notes,
        })
        .returning();
      await tx.insert(farmMembers).values({ farmId: created.id, userId: user.id, role: "pemilik" });
      if (!user.activeFarmId) {
        await tx.update(users).set({ activeFarmId: created.id, updatedAt: new Date() }).where(eq(users.id, user.id));
      }
      return created;
    });
    return jsonOk(farm, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
