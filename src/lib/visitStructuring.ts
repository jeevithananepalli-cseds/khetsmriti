import "server-only";
import { z } from "zod";
import type { Farmer, Village, VisitStructured } from "@/types/domain";
import { structureVisitMessages } from "@/prompts/structureVisit";
import { products } from "./data";
import { filterKnownProductIds } from "./guardrails";
import { generateJSON, type LlmError } from "./llm";

export interface StructuredVisitDraft {
  structured: VisitStructured;
  noteLanguage: "te" | "en" | "mixed";
  /** Product names/ids from the note that are not in the catalogue; never saved as advice. */
  unknownProducts: string[];
  warnings: string[];
  model: string;
}

export type StructureResult = { ok: true; data: StructuredVisitDraft } | { ok: false; error: LlmError };

function llmVisitSchema(crops: readonly string[]) {
  return z.object({
    crop: z.enum(crops as [string, ...string[]]),
    cropStage: z.string().min(1),
    issue: z.object({
      type: z.enum(["pest", "disease", "soil", "price", "irrigation"]),
      name: z.string().min(1).transform((s) => s.trim().toLowerCase()),
    }),
    advice: z.object({ productIds: z.array(z.string()), note: z.string().min(1) }),
    objection: z.string().min(1).nullable(),
    farmerReaction: z.enum(["accepted", "hesitant", "rejected"]),
    unknownProductMentions: z.array(z.string()).default([]),
    noteLanguage: z.enum(["te", "en", "mixed"]).default("en"),
  });
}

export async function structureVisit(
  farmer: Farmer,
  village: Village,
  visitDate: string,
  note: string,
): Promise<StructureResult> {
  const catalogue = products.filter((p) => p.crops.some((c) => farmer.crops.includes(c)));
  const llm = await generateJSON(
    llmVisitSchema(farmer.crops),
    structureVisitMessages({ farmer, village, visitDate, note, catalogue }),
  );
  if (!llm.ok) return { ok: false, error: llm.error };

  const { unknownProductMentions, noteLanguage, ...visit } = llm.data;
  const ids = filterKnownProductIds(visit.advice.productIds, products);
  const unknownProducts = [...unknownProductMentions, ...ids.unknown];
  const warnings = unknownProducts.map(
    (p) => `"${p}" is not in the product catalogue, so it was not saved as advice.`,
  );
  const unlabelled = ids.known.filter((id) => !products.find((p) => p.id === id)?.crops.includes(visit.crop));
  const labelWarnings = unlabelled.map((id) => `${id} is not labelled for ${visit.crop}; please double-check.`);

  return {
    ok: true,
    data: {
      structured: { ...visit, advice: { ...visit.advice, productIds: ids.known } },
      noteLanguage,
      unknownProducts,
      warnings: [...warnings, ...labelWarnings],
      model: llm.model,
    },
  };
}
