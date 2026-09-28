import { z } from "zod";
import { fail, ok, parseJsonBody, rateLimited, serverError, statusFor } from "@/lib/api";
import { recordOutcome } from "@/lib/visits";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  visitId: z.string().regex(/^V\d{3,}$/, "must look like V001"),
  applied: z.boolean(),
  result: z.enum(["controlled", "partial", "failed", "not_applied"]),
  yieldNote: z.string().trim().min(3).max(1000),
  followUpDate: z.iso.date().optional(),
});

/** Records the crop outcome for a visit and retains it in memory. */
export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const body = await parseJsonBody(req, bodySchema);
  if (!body.ok) return body.response;
  try {
    const result = await recordOutcome(body.data);
    return result.ok
      ? ok(result.data, 201)
      : fail(result.error.code, result.error.message, statusFor(result.error.code));
  } catch (err: unknown) {
    return serverError("POST /api/outcomes", err);
  }
}
