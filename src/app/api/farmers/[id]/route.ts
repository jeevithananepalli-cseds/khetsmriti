import { z } from "zod";
import { fail, ok, serverError } from "@/lib/api";
import { getFarmerDetail } from "@/lib/farmers";

export const dynamic = "force-dynamic";

const farmerIdSchema = z.string().regex(/^F\d{3}$/);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!farmerIdSchema.safeParse(id).success) return fail("bad_request", "Farmer id must look like F001.", 400);
  try {
    const detail = await getFarmerDetail(id);
    return detail ? ok(detail) : fail("not_found", `Farmer ${id} not found.`, 404);
  } catch (err: unknown) {
    return serverError(`GET /api/farmers/${id}`, err);
  }
}
