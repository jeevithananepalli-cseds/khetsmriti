import { z } from "zod";
import { fail, ok, parseJsonBody, serverError, statusFor } from "@/lib/api";
import { findFarmer, findVillage } from "@/lib/data";
import { todayInIndia } from "@/lib/season";
import { structureVisit } from "@/lib/visitStructuring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  farmerId: z.string().regex(/^F\d{3}$/, "must look like F001"),
  note: z.string().trim().min(5, "note is too short").max(4000),
  visitDate: z.iso.date().optional(),
});

/** Structures a note for the officer to review; nothing is saved. */
export async function POST(req: Request) {
  const body = await parseJsonBody(req, bodySchema);
  if (!body.ok) return body.response;
  const farmer = findFarmer(body.data.farmerId);
  const village = farmer && findVillage(farmer.villageId);
  if (!farmer || !village) return fail("not_found", `Farmer ${body.data.farmerId} not found.`, 404);
  try {
    const result = await structureVisit(farmer, village, body.data.visitDate ?? todayInIndia(), body.data.note);
    return result.ok ? ok(result.data) : fail(result.error.code, result.error.message, statusFor(result.error.code));
  } catch (err: unknown) {
    return serverError("POST /api/visits/structure", err);
  }
}
