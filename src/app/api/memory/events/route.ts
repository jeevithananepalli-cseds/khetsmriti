import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { getMemoryEvents } from "@/lib/memoryLog";

export const dynamic = "force-dynamic";

const afterSchema = z.coerce.number().int().min(0).default(0);

export function GET(req: Request) {
  const parsed = afterSchema.safeParse(new URL(req.url).searchParams.get("after") ?? undefined);
  if (!parsed.success) return fail("bad_request", "after must be a non-negative integer.", 400);
  return ok(getMemoryEvents(parsed.data));
}
