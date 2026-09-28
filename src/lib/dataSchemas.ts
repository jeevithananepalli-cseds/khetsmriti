import { z } from "zod";
import type { Farmer, Outcome, Product, Village, Visit, VisitStructured } from "@/types/domain";

// zod schemas for the JSON files in /data. Typed against src/types/domain.ts so the two can't drift.

const isoDate = z.iso.date();
const slug = z.string().regex(/^[a-z0-9-]+$/, "must be a lowercase slug");

export const villageSchema: z.ZodType<Village> = z.object({
  id: z.string().regex(/^VL\d{2}$/),
  slug,
  name: z.string().min(1),
  mandal: z.string().min(1),
  district: z.string().min(1),
  dominantCrops: z.array(slug).min(1),
  soilType: z.string().min(1),
});

export const farmerSchema: z.ZodType<Farmer> = z.object({
  id: z.string().regex(/^F\d{3}$/),
  name: z.string().min(1),
  phone: z.string().regex(/^\d{2}x{5}\d{3}$/, "must be masked like 98xxxxx123"),
  villageId: z.string(),
  landAcres: z.number().min(1.5).max(12),
  crops: z.array(slug).min(1),
  irrigation: z.enum(["borewell", "canal", "rainfed"]),
  preferredLanguage: z.enum(["te", "en"]),
  priceSensitivity: z.enum(["high", "medium", "low"]),
});

export const productSchema: z.ZodType<Product> = z.object({
  id: z.string().regex(/^P\d{3}$/),
  name: z.string().min(1),
  type: z.enum(["fungicide", "insecticide", "herbicide", "fertiliser", "seed"]),
  targetIssues: z.array(z.string().min(1)).min(1),
  crops: z.array(slug).min(1),
  dosePerAcre: z.string().min(1),
  packSize: z.string().min(1),
  priceINR: z.number().int().positive(),
  tier: z.enum(["budget", "standard", "premium"]),
});

export const visitSchema: z.ZodType<Visit> = z.object({
  id: z.string().regex(/^V\d{3}$/),
  farmerId: z.string(),
  officerId: z.string().regex(/^O\d{2}$/),
  date: isoDate,
  crop: slug,
  cropStage: z.string().min(1),
  issue: z.object({
    type: z.enum(["pest", "disease", "soil", "price", "irrigation"]),
    name: z.string().min(1),
  }),
  advice: z.object({
    productIds: z.array(z.string()),
    note: z.string().min(1),
  }),
  objection: z.string().min(1).nullable(),
  farmerReaction: z.enum(["accepted", "hesitant", "rejected"]),
});

export const outcomeSchema: z.ZodType<Outcome> = z.object({
  visitId: z.string(),
  followUpDate: isoDate,
  applied: z.boolean(),
  result: z.enum(["controlled", "partial", "failed", "not_applied"]),
  yieldNote: z.string().min(1),
});

export const visitStructuredSchema: z.ZodType<VisitStructured> = z.object({
  crop: slug,
  cropStage: z.string().min(1),
  issue: z.object({
    type: z.enum(["pest", "disease", "soil", "price", "irrigation"]),
    name: z.string().min(1),
  }),
  advice: z.object({
    productIds: z.array(z.string()),
    note: z.string().min(1),
  }),
  objection: z.string().min(1).nullable(),
  farmerReaction: z.enum(["accepted", "hesitant", "rejected"]),
});

export const villagesFileSchema = z.array(villageSchema);
export const farmersFileSchema = z.array(farmerSchema);
export const productsFileSchema = z.array(productSchema);
export const visitsSeedFileSchema = z.object({
  visits: z.array(visitSchema),
  outcomes: z.array(outcomeSchema),
});
