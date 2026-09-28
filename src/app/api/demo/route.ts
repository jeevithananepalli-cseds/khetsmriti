import { z } from "zod";
import { fail, ok, parseJsonBody, rateLimited, serverError } from "@/lib/api";
import { replayStep, resetDemo, startReplay } from "@/lib/demo";
import { MemoryError } from "@/lib/memory";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset") }),
  z.object({ action: z.literal("replay-start") }),
  z.object({ action: z.literal("replay-step"), step: z.number().int().min(0).max(50) }),
]);

/** Demo controls: reset the demo farmer's memory, or replay their history one visit at a time. */
export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const body = await parseJsonBody(req, bodySchema);
  if (!body.ok) return body.response;
  try {
    switch (body.data.action) {
      case "reset":
        return ok({ event: await resetDemo() });
      case "replay-start":
        return ok({ steps: await startReplay() });
      case "replay-step": {
        const result = await replayStep(body.data.step);
        return result ? ok(result) : fail("not_found", `Replay step ${body.data.step} does not exist.`, 404);
      }
    }
  } catch (err: unknown) {
    if (err instanceof MemoryError) return fail("memory_unavailable", err.message, 503);
    return serverError("POST /api/demo", err);
  }
}
