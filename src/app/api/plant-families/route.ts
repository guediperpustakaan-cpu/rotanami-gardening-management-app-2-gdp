import { db } from "@/db";
import { plantFamilies } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handleError, jsonOk, parseBody } from "@/lib/http";
import { familySchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    const rows = await db.select().from(plantFamilies).orderBy(plantFamilies.name);
    return jsonOk(rows);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await parseBody(request, familySchema);
    const [created] = await db
      .insert(plantFamilies)
      .values({
        name: body.name,
        rotationGroup: body.rotationGroup,
        notes: body.notes,
        isDemo: false,
      })
      .returning();
    return jsonOk(created, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
