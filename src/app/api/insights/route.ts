import { z } from "zod";
import { fail, ok, rateLimited, serverError } from "@/lib/api";
import { findVillageBySlug } from "@/lib/data";
import { cropsForVillage, getVillageInsights } from "@/lib/insights";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const querySchema = z.object({
  village: z.string().regex(/^[a-z0-9-]+$/, "village must be a slug like chevella"),
  crop: z
    .string()
    .regex(/^[a-z0-9-]+$/, "crop must be a slug like chilli")
    .optional(),
});

export async function GET(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return fail("bad_request", parsed.error.issues.map((i) => i.message).join("; "), 400);

  const village = findVillageBySlug(parsed.data.village);
  if (!village) return fail("not_found", `Village ${parsed.data.village} not found.`, 404);
  const crop = parsed.data.crop ?? null;
  if (crop && !cropsForVillage(village).includes(crop)) {
    return fail("bad_request", `${crop} is not a main crop in ${village.name}.`, 400);
  }

  try {
    const result = await getVillageInsights(village, crop);
    if (result.insights.every((i) => i.error !== null)) {
      return fail("memory_unavailable", result.insights[0]?.error ?? "Memory service unavailable.", 503);
    }
    return ok(result);
  } catch (err: unknown) {
    return serverError("GET /api/insights", err);
  }
}
