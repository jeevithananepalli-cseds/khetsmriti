import type { Farmer, MemoryHit, Product, Village } from "@/types/domain";
import type { ChatMessage } from "@/lib/llm";
import { BRIEF_JSON_SHAPE } from "@/lib/briefSchema";
import { formatRupees } from "@/lib/format";

export interface BriefPromptInput {
  farmer: Farmer;
  village: Village;
  visitDate: string;
  cropStages: ReadonlyArray<{ crop: string; stageGuess: string }>;
  memoryEnabled: boolean;
  farmerMemories: readonly MemoryHit[];
  similarMemories: readonly MemoryHit[];
  catalogue: readonly Product[];
}

// Keeps the prompt well inside Groq's per-minute token budget while covering a season of visits.
const MAX_FARMER_MEMORIES = 24;
const MAX_SIMILAR_MEMORIES = 14;
const MAX_MEMORY_CHARS = 320;

/** Hindsight appends " | When: … | Involving: …"; the date is already shown, so drop the When part. */
function compactMemoryText(text: string): string {
  return text.replace(/\s*\|\s*When:[^|]*/g, "").trim();
}

function memoryLine(m: MemoryHit): string {
  const date = m.occurredAt ? m.occurredAt.slice(0, 10) : "undated";
  const compact = compactMemoryText(m.text);
  const text = compact.length > MAX_MEMORY_CHARS ? `${compact.slice(0, MAX_MEMORY_CHARS)}…` : compact;
  return `- [${date}] (${m.type ?? "memory"}) ${text}`;
}

function catalogueLine(p: Product): string {
  return (
    `${p.id} | ${p.name} | ${p.type} | ${p.tier} | ${formatRupees(p.priceINR)} per ${p.packSize} | ` +
    `dose per acre: ${p.dosePerAcre} | targets: ${p.targetIssues.join(", ")} | crops: ${p.crops.join(", ")}`
  );
}

const SYSTEM_PROMPT = `You are KhetSmriti, the field memory of an agri-input distributor in Telangana.
You write a short pre-visit brief for a field officer who is about to visit a farmer.

Hard rules:
1. Recommend ONLY products from the PRODUCT CATALOGUE, by their exact id (e.g. "P007"). Never invent products.
2. Never state a dosage that is not written in the catalogue. If you mention a dose, copy the catalogue text exactly.
3. Every claim about the past must cite the date of the memory that supports it, as YYYY-MM-DD, taken from the
   [date] shown on that memory. Never invent dates. General advice that is not about the past gets sourceVisitDate null.
4. If there is no history, say so plainly: lastVisitSummary must be "No history with this farmer yet.",
   claims must be empty, confidence must be "low", and recommendations must rely only on crop stage and catalogue.
5. Prefer advice that has actually worked for this farmer or in this village; call out advice that failed or was rejected.
6. Tailor howToPitch to the farmer's price sensitivity. If memories show past objections (e.g. price), name the
   objection and its date, and use what overcame it before (e.g. showing a neighbour's yield result, cost per acre).
7. Write plain, short English a field officer can read on a phone. Rupees as ₹1,240.
8. Reply with ONLY a JSON object in exactly this shape:
${BRIEF_JSON_SHAPE}`;

function historySection(input: BriefPromptInput): string {
  if (!input.memoryEnabled) {
    return "MEMORY: OFF. No visit history is available for this farmer. Do not refer to any past visits.";
  }
  const farmer = input.farmerMemories.slice(0, MAX_FARMER_MEMORIES).map(memoryLine);
  const similar = input.similarMemories.slice(0, MAX_SIMILAR_MEMORIES).map(memoryLine);
  return [
    `MEMORIES ABOUT THIS FARMER (${farmer.length}):`,
    farmer.length ? farmer.join("\n") : "- none (no history with this farmer yet)",
    "",
    `SIMILAR CASES FROM OTHER FARMERS IN ${input.village.name.toUpperCase()} (same crops) (${similar.length}):`,
    similar.length ? similar.join("\n") : "- none",
  ].join("\n");
}

export function briefMessages(input: BriefPromptInput): ChatMessage[] {
  const { farmer, village } = input;
  const user = [
    `UPCOMING VISIT: ${input.visitDate}`,
    `FARMER: ${farmer.name} (${farmer.id}), ${village.name} village, ${village.mandal} mandal, ${village.district} district.`,
    `Land: ${farmer.landAcres} acres · Irrigation: ${farmer.irrigation} · Price sensitivity: ${farmer.priceSensitivity} · ` +
      `Language: ${farmer.preferredLanguage === "te" ? "Telugu" : "English"}.`,
    `Village soil: ${village.soilType}.`,
    `CROPS AND LIKELY STAGE TODAY: ${input.cropStages.map((c) => `${c.crop} (${c.stageGuess})`).join("; ")}.`,
    "",
    historySection(input),
    "",
    "PRODUCT CATALOGUE (the only products you may recommend):",
    input.catalogue.map(catalogueLine).join("\n"),
    "",
    "Write the pre-visit brief now as JSON.",
  ].join("\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}
