import { z } from "zod";
import type { Brief } from "@/types/domain";

// Schema for the LLM's pre-visit brief. Also used to render the JSON shape inside the prompt.

const isoDateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
  .nullable();

export const briefSchema: z.ZodType<Brief> = z.object({
  headline: z.string().min(1),
  lastVisitSummary: z.string().min(1),
  whatToCheck: z.array(z.string().min(1)).max(6),
  recommendedProducts: z
    .array(
      z.object({
        productId: z.string().regex(/^P\d{3}$/, "must be a catalogue id like P007"),
        why: z.string().min(1),
        evidence: z.string().min(1),
      }),
    )
    .max(4),
  howToPitch: z.string().min(1),
  openQuestions: z.array(z.string().min(1)).max(5),
  claims: z
    .array(
      z.object({
        text: z.string().min(1),
        sourceVisitDate: isoDateOrNull,
      }),
    )
    .max(8),
  confidence: z.enum(["low", "medium", "high"]),
});

export const BRIEF_JSON_SHAPE = `{
  "headline": string,                 // one line: the single most important thing for this visit
  "lastVisitSummary": string,         // what happened last time, with its date; or "No history."
  "whatToCheck": string[],            // up to 6 field checks for this visit
  "recommendedProducts": [            // up to 4, catalogue ids only
    { "productId": "P007", "why": string, "evidence": string }  // one sentence: what happened, with its YYYY-MM-DD date(s)
  ],
  "howToPitch": string,               // how to present the advice to THIS farmer
  "openQuestions": string[],          // up to 5 things to ask the farmer
  "claims": [ { "text": string, "sourceVisitDate": "YYYY-MM-DD" | null } ],  // up to 8
  "confidence": "low" | "medium" | "high"
}`;
