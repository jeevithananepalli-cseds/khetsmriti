import type { Brief, Product } from "@/types/domain";

// Post-LLM checks. Pure functions so they can be unit tested.

export interface ProductGuardResult {
  brief: Brief;
  droppedProductIds: string[];
}

/** Removes any recommended product whose id is not in the catalogue. */
export function enforceCatalogue(brief: Brief, catalogue: readonly Product[]): ProductGuardResult {
  const known = new Set(catalogue.map((p) => p.id));
  const kept = brief.recommendedProducts.filter((r) => known.has(r.productId));
  const droppedProductIds = brief.recommendedProducts
    .filter((r) => !known.has(r.productId))
    .map((r) => r.productId);
  return { brief: { ...brief, recommendedProducts: kept }, droppedProductIds };
}

/** Returns only the product ids that exist in the catalogue, plus the unknown ones that were dropped. */
export function filterKnownProductIds(
  ids: readonly string[],
  catalogue: readonly Product[],
): { known: string[]; unknown: string[] } {
  const catalogueIds = new Set(catalogue.map((p) => p.id));
  return {
    known: ids.filter((id) => catalogueIds.has(id)),
    unknown: ids.filter((id) => !catalogueIds.has(id)),
  };
}

export interface ClaimGuardResult {
  brief: Brief;
  unverifiedClaims: string[];
}

/** Clears citation dates that don't match any remembered visit, so the UI never shows a made-up source. */
export function enforceCitations(brief: Brief, knownDates: ReadonlySet<string>): ClaimGuardResult {
  const unverifiedClaims: string[] = [];
  const claims = brief.claims.map((c) => {
    if (c.sourceVisitDate && !knownDates.has(c.sourceVisitDate)) {
      unverifiedClaims.push(c.text);
      return { ...c, sourceVisitDate: null };
    }
    return c;
  });
  return { brief: { ...brief, claims }, unverifiedClaims };
}
