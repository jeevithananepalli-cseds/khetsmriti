import "server-only";
import type { InsightKey, InsightsResponse, Village, VillageInsight } from "@/types/domain";
import { MemoryError, reflectVillage } from "./memory";
import { todayInIndia } from "./season";

// Village insights = three fixed reflect questions, cached in memory for 5 minutes.

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  expires: number;
  value: InsightsResponse;
}

const globalForCache = globalThis as typeof globalThis & { __khetInsights?: Map<string, CacheEntry> };
const cache = (globalForCache.__khetInsights ??= new Map<string, CacheEntry>());

function nextMonthName(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return next.toLocaleString("en-IN", { month: "long", timeZone: "UTC" });
}

export function insightQuestions(village: Village, crop: string | null, today: string): Record<InsightKey, string> {
  const cropText = crop ?? village.dominantCrops.join(", ");
  return {
    what_works:
      `For ${cropText} in ${village.name}: what is the most common problem, which advice and products have worked ` +
      "for it, and which failed or were rejected? Name the products and cite visit dates.",
    objections:
      `How do farmers in ${village.name} respond to price, and how should officers handle price objections ` +
      "and preferences for a neighbour's brand? What framing has worked? Cite visit dates.",
    watch_next:
      `Based on past visits in ${village.name}, which ${cropText} pests or diseases should officers watch for in ` +
      `${nextMonthName(today)}, and what should they check early? Cite the visits that show the pattern.`,
  };
}

async function askOne(village: Village, crop: string | null, key: InsightKey, question: string): Promise<VillageInsight> {
  const base = { key, villageSlug: village.slug, cropSlug: crop, question };
  try {
    const result = await reflectVillage(village.slug, question, crop ?? undefined);
    return { ...base, answer: result.text, sources: result.sources, error: null };
  } catch (err: unknown) {
    const message = err instanceof MemoryError ? err.message : "Could not reach the memory service.";
    return { ...base, answer: "", sources: [], error: message };
  }
}

export async function getVillageInsights(village: Village, crop: string | null): Promise<InsightsResponse> {
  const cacheKey = `${village.slug}|${crop ?? "*"}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return { ...hit.value, cached: true };

  const questions = insightQuestions(village, crop, todayInIndia());
  const insights = await Promise.all(
    (Object.keys(questions) as InsightKey[]).map((key) => askOne(village, crop, key, questions[key])),
  );
  const value: InsightsResponse = {
    villageSlug: village.slug,
    cropSlug: crop,
    generatedAt: new Date().toISOString(),
    cached: false,
    insights,
  };
  // Only cache complete answers so a transient failure is retried on the next request.
  if (insights.every((i) => i.error === null)) cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value });
  return value;
}

/** Crops that make sense to ask about in a village: its dominant crops. */
export function cropsForVillage(village: Village): readonly string[] {
  return village.dominantCrops;
}
