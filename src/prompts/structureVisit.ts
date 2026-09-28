import type { Farmer, Product, Village } from "@/types/domain";
import type { ChatMessage } from "@/lib/llm";
import { formatRupees } from "@/lib/narrative";

export interface StructureVisitPromptInput {
  farmer: Farmer;
  village: Village;
  visitDate: string;
  note: string;
  catalogue: readonly Product[];
}

export const STRUCTURED_VISIT_JSON_SHAPE = `{
  "crop": string,                       // one of the farmer's crops, exactly as listed
  "cropStage": string,                  // e.g. "vegetative", "flowering", "boll formation"
  "issue": { "type": "pest" | "disease" | "soil" | "price" | "irrigation", "name": string },  // name lowercase, e.g. "leaf blight"
  "advice": { "productIds": string[], "note": string },  // catalogue ids only; note = short English summary of what was seen and advised
  "objection": string | null,           // the farmer's objection in English, e.g. "price too high"; null if none
  "farmerReaction": "accepted" | "hesitant" | "rejected",
  "unknownProductMentions": string[],   // product names mentioned in the note that are NOT in the catalogue
  "noteLanguage": "te" | "en" | "mixed"
}`;

const SYSTEM_PROMPT = `You turn a field officer's short visit note into structured data.
The note may be in English, Telugu, or a mix (Telugu words may be written in Telugu script or in English letters).

Rules:
1. Only put a product in advice.productIds if the note clearly refers to it AND it is in the PRODUCT CATALOGUE.
   Match brand or chemical names (e.g. "Blitox" or "copper oxychloride" -> P007). Never guess an id.
2. If the note mentions a product that is not in the catalogue, list its name in unknownProductMentions
   and do not invent an id for it.
3. crop must be one of the farmer's crops. If the note does not say, pick the crop the issue most likely affects.
4. Translate everything into short, plain English. Keep numbers, prices and dates from the note.
5. Do not add advice or facts that are not in the note.
6. Reply with ONLY a JSON object in exactly this shape:
${STRUCTURED_VISIT_JSON_SHAPE}`;

export function structureVisitMessages(input: StructureVisitPromptInput): ChatMessage[] {
  const catalogue = input.catalogue
    .map((p) => `${p.id} | ${p.name} | ${p.type} | ${formatRupees(p.priceINR)} per ${p.packSize} | targets: ${p.targetIssues.join(", ")}`)
    .join("\n");
  const user = [
    `VISIT DATE: ${input.visitDate}`,
    `FARMER: ${input.farmer.name} (${input.farmer.id}), ${input.village.name}. Crops: ${input.farmer.crops.join(", ")}.`,
    "",
    "PRODUCT CATALOGUE:",
    catalogue,
    "",
    "OFFICER'S NOTE:",
    `"""${input.note}"""`,
  ].join("\n");
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}
