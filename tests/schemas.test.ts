import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { briefSchema } from "@/lib/briefSchema";
import {
  farmersFileSchema,
  productsFileSchema,
  villagesFileSchema,
  visitSchema,
  visitsSeedFileSchema,
  visitStructuredSchema,
} from "@/lib/dataSchemas";
import { makeBrief, visit } from "./fixtures";

const readJson = (file: string): unknown => JSON.parse(readFileSync(join(process.cwd(), "data", file), "utf8"));

describe("briefSchema", () => {
  it("accepts a well-formed brief", () => {
    expect(briefSchema.safeParse(makeBrief()).success).toBe(true);
  });

  it("rejects product ids that are not catalogue-shaped", () => {
    const bad = makeBrief({ recommendedProducts: [{ productId: "Blitox", why: "a", evidence: "b" }] });
    expect(briefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects citation dates that are not YYYY-MM-DD", () => {
    const bad = makeBrief({ claims: [{ text: "x", sourceVisitDate: "8 April" }] });
    expect(briefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown confidence level and missing fields", () => {
    expect(briefSchema.safeParse({ ...makeBrief(), confidence: "certain" }).success).toBe(false);
    const withoutHeadline: Partial<ReturnType<typeof makeBrief>> = { ...makeBrief() };
    delete withoutHeadline.headline;
    expect(briefSchema.safeParse(withoutHeadline).success).toBe(false);
  });

  it("caps list lengths so a runaway model can't flood the UI", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ text: `c${i}`, sourceVisitDate: null }));
    expect(briefSchema.safeParse(makeBrief({ claims: many })).success).toBe(false);
  });
});

describe("visit schemas", () => {
  it("accepts a valid visit and its structured part", () => {
    expect(visitSchema.safeParse(visit).success).toBe(true);
    const structured = {
      crop: visit.crop,
      cropStage: visit.cropStage,
      issue: visit.issue,
      advice: visit.advice,
      objection: visit.objection,
      farmerReaction: visit.farmerReaction,
    };
    expect(visitStructuredSchema.safeParse(structured).success).toBe(true);
  });

  it("rejects bad ids, dates and reactions", () => {
    expect(visitSchema.safeParse({ ...visit, id: "visit-2" }).success).toBe(false);
    expect(visitSchema.safeParse({ ...visit, date: "2026-13-40" }).success).toBe(false);
    expect(visitSchema.safeParse({ ...visit, farmerReaction: "angry" }).success).toBe(false);
  });
});

describe("data files", () => {
  it("all JSON files in /data match their schemas", () => {
    expect(villagesFileSchema.safeParse(readJson("villages.json")).success).toBe(true);
    expect(farmersFileSchema.safeParse(readJson("farmers.json")).success).toBe(true);
    expect(productsFileSchema.safeParse(readJson("products.json")).success).toBe(true);
    expect(visitsSeedFileSchema.safeParse(readJson("visits.seed.json")).success).toBe(true);
  });
});
