import { describe, expect, it } from "vitest";
import { enforceCatalogue, enforceCitations, filterKnownProductIds } from "@/lib/guardrails";
import { catalogue, makeBrief } from "./fixtures";

describe("enforceCatalogue", () => {
  it("keeps catalogue products untouched", () => {
    const brief = makeBrief();
    const result = enforceCatalogue(brief, catalogue);
    expect(result.droppedProductIds).toEqual([]);
    expect(result.brief.recommendedProducts).toEqual(brief.recommendedProducts);
  });

  it("drops and reports ids that are not in the catalogue", () => {
    const brief = makeBrief({
      recommendedProducts: [
        { productId: "P007", why: "a", evidence: "b" },
        { productId: "P999", why: "invented", evidence: "none" },
      ],
    });
    const result = enforceCatalogue(brief, catalogue);
    expect(result.droppedProductIds).toEqual(["P999"]);
    expect(result.brief.recommendedProducts.map((r) => r.productId)).toEqual(["P007"]);
  });

  it("does not mutate the input brief", () => {
    const brief = makeBrief({ recommendedProducts: [{ productId: "P999", why: "x", evidence: "y" }] });
    enforceCatalogue(brief, catalogue);
    expect(brief.recommendedProducts).toHaveLength(1);
  });
});

describe("filterKnownProductIds", () => {
  it("splits ids into known and unknown", () => {
    expect(filterKnownProductIds(["P006", "X1", "P007"], catalogue)).toEqual({ known: ["P006", "P007"], unknown: ["X1"] });
  });
});

describe("enforceCitations", () => {
  it("keeps citations whose date is a remembered visit", () => {
    const result = enforceCitations(makeBrief(), new Set(["2026-04-08"]));
    expect(result.unverifiedClaims).toEqual([]);
    expect(result.brief.claims[0]?.sourceVisitDate).toBe("2026-04-08");
  });

  it("clears citation dates that no memory supports", () => {
    const result = enforceCitations(makeBrief(), new Set(["2026-05-01"]));
    expect(result.unverifiedClaims).toEqual(["Rejected Amistar on price"]);
    expect(result.brief.claims[0]?.sourceVisitDate).toBeNull();
  });

  it("leaves undated general claims alone", () => {
    const brief = makeBrief({ claims: [{ text: "Spray on a dry day", sourceVisitDate: null }] });
    expect(enforceCitations(brief, new Set()).unverifiedClaims).toEqual([]);
  });
});
