import { describe, expect, it } from "vitest";
import {
  buildOutcomeNarrative,
  buildVisitNarrative,
  isoTimestamp,
  memoryMetadata,
  outcomeDocumentId,
  outcomeTags,
  tag,
  visitDocumentId,
  visitTags,
} from "@/lib/narrative";
import { catalogue, farmer, outcome, village, visit } from "./fixtures";

describe("tag scheme", () => {
  it("uses the exact prefixes from CLAUDE.md", () => {
    expect(tag.farmer("F001")).toBe("farmer:F001");
    expect(tag.village("chevella")).toBe("village:chevella");
    expect(tag.crop("chilli")).toBe("crop:chilli");
    expect(tag.officer("O01")).toBe("officer:O01");
    expect(tag.kind("visit")).toBe("kind:visit");
    expect(tag.kind("outcome")).toBe("kind:outcome");
  });

  it("tags a visit with farmer, village, crop, officer and kind", () => {
    expect(visitTags(visit, village)).toEqual([
      "farmer:F001",
      "village:chevella",
      "crop:chilli",
      "officer:O01",
      "kind:visit",
    ]);
    expect(outcomeTags(visit, village)).toContain("kind:outcome");
  });

  it("builds stable document ids for idempotent retains", () => {
    expect(visitDocumentId("V002")).toBe("visit:V002");
    expect(outcomeDocumentId("V002")).toBe("outcome:V002");
  });

  it("passes string-only metadata", () => {
    const meta = memoryMetadata(visit, village);
    expect(meta).toEqual({ farmerId: "F001", visitId: "V002", village: "chevella", crop: "chilli", officerId: "O01" });
    expect(Object.values(meta).every((v) => typeof v === "string")).toBe(true);
  });

  it("anchors timestamps to the visit date in IST", () => {
    expect(isoTimestamp("2026-04-08")).toBe("2026-04-08T10:00:00+05:30");
  });
});

describe("buildVisitNarrative", () => {
  const text = buildVisitNarrative(visit, farmer, village, catalogue);

  it("includes date, farmer, village, crop, stage and issue", () => {
    expect(text).toContain("2026-04-08");
    expect(text).toContain("Ramesh Goud (F001)");
    expect(text).toContain("Chevella");
    expect(text).toContain("Crop: chilli, stage: fruiting");
    expect(text).toContain("leaf blight");
  });

  it("names the advised product with id, tier and rupee price", () => {
    expect(text).toContain("Amistar Top (P006, premium tier, ₹1,480 per 500 ml");
  });

  it("records the objection and reaction", () => {
    expect(text).toContain("Farmer objected: price too high.");
    expect(text).toContain("Farmer reaction to the advice: rejected.");
  });

  it("says so when nothing was advised or objected", () => {
    const plain = buildVisitNarrative(
      { ...visit, advice: { productIds: [], note: "Deep ploughing" }, objection: null },
      farmer,
      village,
      catalogue,
    );
    expect(plain).toContain("No product advised.");
    expect(plain).toContain("Farmer raised no objection.");
  });

  it("flags an id missing from the catalogue instead of inventing a name", () => {
    const odd = buildVisitNarrative({ ...visit, advice: { productIds: ["P999"], note: "x" } }, farmer, village, catalogue);
    expect(odd).toContain("unknown product P999");
  });
});

describe("buildOutcomeNarrative", () => {
  it("links the outcome to its visit and states the result plainly", () => {
    const text = buildOutcomeNarrative(outcome, visit, farmer, village, catalogue);
    expect(text).toContain("follow-up on 2026-04-18 for the 2026-04-08 visit (V002)");
    expect(text).toContain("The farmer did not apply the advice.");
    expect(text).toContain("20% yield loss");
  });

  it("describes a controlled result as advice that worked", () => {
    const text = buildOutcomeNarrative(
      { ...outcome, applied: true, result: "controlled" },
      visit,
      farmer,
      village,
      catalogue,
    );
    expect(text).toContain("The advice worked");
  });
});
