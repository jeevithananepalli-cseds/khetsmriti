import { z } from "zod";
import { fail, ok, parseJsonBody, rateLimited, serverError, statusFor } from "@/lib/api";
import { visitStructuredSchema } from "@/lib/dataSchemas";
import { logVisit } from "@/lib/visits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  farmerId: z.string().regex(/^F\d{3}$/, "must look like F001"),
  note: z.string().trim().min(5, "note is too short").max(4000),
  officerId: z.enum(["O01", "O02"]).default("O01"),
  visitDate: z.iso.date().optional(),
  structured: visitStructuredSchema.optional(),
});

/** Saves a visit (structuring the note first if needed) and retains it in memory. */
export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const body = await parseJsonBody(req, bodySchema);
  if (!body.ok) return body.response;
  try {
    const result = await logVisit(body.data);
    return result.ok
      ? ok(result.data, 201)
      : fail(result.error.code, result.error.message, statusFor(result.error.code));
  } catch (err: unknown) {
    return serverError("POST /api/visits", err);
  }
}
