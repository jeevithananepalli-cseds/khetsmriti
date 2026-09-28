import { listFarmerSummaries } from "@/lib/farmers";
import { ok, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await listFarmerSummaries());
  } catch (err: unknown) {
    return serverError("GET /api/farmers", err);
  }
}
