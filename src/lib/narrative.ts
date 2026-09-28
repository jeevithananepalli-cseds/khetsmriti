import type { Farmer, Outcome, OutcomeResult, Product, Village, Visit } from "@/types/domain";

// Pure builders for the text + tags we retain in Hindsight. No I/O, so they are easy to unit test.

export const tag = {
  farmer: (id: string): string => `farmer:${id}`,
  village: (slug: string): string => `village:${slug}`,
  crop: (slug: string): string => `crop:${slug}`,
  officer: (id: string): string => `officer:${id}`,
  kind: (kind: "visit" | "outcome"): string => `kind:${kind}`,
};

export const visitDocumentId = (visitId: string): string => `visit:${visitId}`;
export const outcomeDocumentId = (visitId: string): string => `outcome:${visitId}`;

/** Visits are logged in the morning IST; a fixed time keeps timestamps stable across re-seeds. */
export function isoTimestamp(date: string): string {
  return `${date}T10:00:00+05:30`;
}

export function formatRupees(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
}

function describeProducts(productIds: readonly string[], catalogue: readonly Product[]): string {
  if (productIds.length === 0) return "No product advised.";
  const parts = productIds.map((id) => {
    const p = catalogue.find((x) => x.id === id);
    return p
      ? `${p.name} (${p.id}, ${p.tier} tier, ${formatRupees(p.priceINR)} per ${p.packSize}, dose ${p.dosePerAcre} per acre)`
      : `unknown product ${id}`;
  });
  return `Advised ${parts.join("; ")}.`;
}

export function visitTags(visit: Visit, village: Village): string[] {
  return [
    tag.farmer(visit.farmerId),
    tag.village(village.slug),
    tag.crop(visit.crop),
    tag.officer(visit.officerId),
    tag.kind("visit"),
  ];
}

export function outcomeTags(visit: Visit, village: Village): string[] {
  return [
    tag.farmer(visit.farmerId),
    tag.village(village.slug),
    tag.crop(visit.crop),
    tag.officer(visit.officerId),
    tag.kind("outcome"),
  ];
}

export function memoryMetadata(visit: Visit, village: Village): Record<string, string> {
  return {
    farmerId: visit.farmerId,
    visitId: visit.id,
    village: village.slug,
    crop: visit.crop,
    officerId: visit.officerId,
  };
}

export function buildVisitNarrative(
  visit: Visit,
  farmer: Farmer,
  village: Village,
  catalogue: readonly Product[],
): string {
  const objection = visit.objection
    ? `Farmer objected: ${visit.objection}.`
    : "Farmer raised no objection.";
  return [
    `Field visit on ${visit.date} to ${farmer.name} (${farmer.id}) in ${village.name} village, ${village.mandal} mandal.`,
    `Crop: ${visit.crop}, stage: ${visit.cropStage}.`,
    `Issue (${visit.issue.type}): ${visit.issue.name}.`,
    describeProducts(visit.advice.productIds, catalogue),
    `Officer note: ${visit.advice.note}`,
    objection,
    `Farmer reaction to the advice: ${visit.farmerReaction}.`,
    `Farmer profile: ${farmer.landAcres} acres, ${farmer.irrigation} irrigation, ${farmer.priceSensitivity} price sensitivity.`,
    `Officer: ${visit.officerId}. Visit id: ${visit.id}.`,
  ].join(" ");
}

const RESULT_TEXT: Record<OutcomeResult, string> = {
  controlled: "The advice worked: the issue was controlled.",
  partial: "The advice partly worked: the issue was only partially controlled.",
  failed: "The advice failed: the issue was not controlled.",
  not_applied: "The farmer did not apply the advice.",
};

export function buildOutcomeNarrative(
  outcome: Outcome,
  visit: Visit,
  farmer: Farmer,
  village: Village,
  catalogue: readonly Product[],
): string {
  return [
    `Crop outcome follow-up on ${outcome.followUpDate} for the ${visit.date} visit (${visit.id}) to ${farmer.name} (${farmer.id}) in ${village.name}.`,
    `Crop: ${visit.crop}. Issue: ${visit.issue.name}.`,
    describeProducts(visit.advice.productIds, catalogue),
    outcome.applied ? "The farmer applied the advice." : "The farmer did not apply the advice.",
    RESULT_TEXT[outcome.result],
    `Field note: ${outcome.yieldNote}`,
    `Officer: ${visit.officerId}.`,
  ].join(" ");
}
