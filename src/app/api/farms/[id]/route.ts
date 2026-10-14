import { eq } from "drizzle-orm";
import { db } from "@/db";
import { farms } from "@/db/schema";
import { deleteFarmCascade, requireFarmAccess, requireOwner } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { handleError, jsonError, jsonOk, parseBody } from "@/lib/http";
import { deleteConfirmSchema, farmUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const farm = await requireFarmAccess(user.id, id);
    return jsonOk(farm);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await requireOwner(user.id, id);
    const body = await parseBody(request, farmUpdateSchema);
    const [updated] = await db
      .update(farms)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(farms.id, id))
      .returning();
    return jsonOk(updated);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const farm = await requireOwner(user.id, id);
    const body = await parseBody(request, deleteConfirmSchema);
    if (body.confirmName.trim() !== farm.name.trim()) {
      return jsonError("Nama kebun tidak cocok. Penghapusan dibatalkan.", 400);
    }
    await deleteFarmCascade(id);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
