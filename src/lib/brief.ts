import "server-only";
import type { BriefResponse, Farmer, MemoryHit, Village } from "@/types/domain";
import { briefMessages } from "@/prompts/brief";
import { briefSchema } from "./briefSchema";
import { findFarmer, findVillage, products } from "./data";
import { enforceCatalogue, enforceCitations } from "./guardrails";
import { generateJSON, type LlmError } from "./llm";
import { MemoryError, recallFarmer, recallSimilar } from "./memory";
import { guessCropStage, todayInIndia } from "./season";

export interface BuildBriefOptions {
  memoryEnabled: boolean;
  visitDate?: string;
}

export type BriefErrorCode = "not_found" | "memory_unavailable" | LlmError["code"];

export type BuildBriefResult =
  | { ok: true; data: BriefResponse }
  | { ok: false; error: { code: BriefErrorCode; message: string } };

interface RecalledMemories {
  farmerMemories: MemoryHit[];
  similarMemories: MemoryHit[];
}

function dedupe(hits: readonly MemoryHit[]): MemoryHit[] {
  const seen = new Set<string>();
  return hits.filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)));
}

async function recallForVisit(farmer: Farmer, village: Village, visitDate: string): Promise<RecalledMemories> {
  const query =
    `Upcoming visit on ${visitDate} to ${farmer.name} (${farmer.id}) in ${village.name}, crops ${farmer.crops.join(" and ")}. ` +
    "What was advised before, what objections did the farmer raise, and what worked or failed?";

  const [farmerMemories, ...similarByCrop] = await Promise.all([
    recallFarmer(farmer.id, query),
    ...farmer.crops.map((crop) =>
      recallSimilar(
        village.slug,
        crop,
        `${crop} problems in ${village.name}: which advice and products worked, which failed or were rejected on price?`,
      ),
    ),
  ]);

  // Similar cases should come from OTHER farmers; this farmer's own history is already above.
  const similarMemories = dedupe(similarByCrop.flat()).filter((h) => h.metadata.farmerId !== farmer.id);
  return { farmerMemories, similarMemories };
}

function knownDates(memories: RecalledMemories): Set<string> {
  return new Set(
    [...memories.farmerMemories, ...memories.similarMemories]
      .map((m) => m.occurredAt?.slice(0, 10))
      .filter((d): d is string => Boolean(d)),
  );
}

export async function buildBrief(farmerId: string, options: BuildBriefOptions): Promise<BuildBriefResult> {
  const farmer = findFarmer(farmerId);
  const village = farmer && findVillage(farmer.villageId);
  if (!farmer || !village) return { ok: false, error: { code: "not_found", message: `Farmer ${farmerId} not found.` } };

  const visitDate = options.visitDate ?? todayInIndia();
  let memories: RecalledMemories = { farmerMemories: [], similarMemories: [] };

  if (options.memoryEnabled) {
    try {
      memories = await recallForVisit(farmer, village, visitDate);
    } catch (err: unknown) {
      const message = err instanceof MemoryError ? err.message : "Could not reach the memory service.";
      return { ok: false, error: { code: "memory_unavailable", message } };
    }
  }

  const catalogue = products.filter((p) => p.crops.some((c) => farmer.crops.includes(c)));
  const llm = await generateJSON(
    briefSchema,
    briefMessages({
      farmer,
      village,
      visitDate,
      cropStages: farmer.crops.map((crop) => ({ crop, stageGuess: guessCropStage(crop, visitDate) })),
      memoryEnabled: options.memoryEnabled,
      catalogue,
      ...memories,
    }),
  );
  if (!llm.ok) return { ok: false, error: llm.error };

  const catalogueCheck = enforceCatalogue(llm.data, products);
  const cited = enforceCitations(catalogueCheck.brief, knownDates(memories));
  const warnings = [
    ...catalogueCheck.droppedProductIds.map((id) => `Removed unknown product id ${id} suggested by the model.`),
    ...cited.unverifiedClaims.map((text) => `Citation removed (date not found in memory): "${text}"`),
  ];

  return {
    ok: true,
    data: {
      brief: cited.brief,
      memoryEnabled: options.memoryEnabled,
      visitDate,
      model: llm.model,
      attempts: llm.attempts,
      warnings,
      ...memories,
    },
  };
}
