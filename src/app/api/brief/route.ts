import { z } from "zod";
import { fail, ok, parseJsonBody, rateLimited, serverError, statusFor } from "@/lib/api";
import { buildBrief } from "@/lib/brief";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const briefRequestSchema = z.object({
  farmerId: z.string().regex(/^F\d{3}$/, "must look like F001"),
  memoryEnabled: z.boolean(),
  visitDate: z.iso.date().optional(),
});

export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const body = await parseJsonBody(req, briefRequestSchema);
  if (!body.ok) return body.response;
  try {
    const result = await buildBrief(body.data.farmerId, body.data);
    return result.ok ? ok(result.data) : fail(result.error.code, result.error.message, statusFor(result.error.code));
  } catch (err: unknown) {
    return serverError("POST /api/brief", err);
  }
}
