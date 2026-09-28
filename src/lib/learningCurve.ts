import type { Outcome, Visit } from "@/types/domain";

// Monthly learning curve computed from the (simulated) field data files. Pure, so it is unit-testable.

export interface LearningPoint {
  month: string; // YYYY-MM
  label: string; // "Apr"
  advised: number; // visits where a product was advised
  acceptedPct: number | null;
  withOutcome: number; // advised visits that have a follow-up outcome
  controlledPct: number | null;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pct(part: number, whole: number): number | null {
  return whole === 0 ? null : Math.round((part / whole) * 100);
}

export function learningCurve(visits: readonly Visit[], outcomes: readonly Outcome[]): LearningPoint[] {
  const outcomeByVisit = new Map(outcomes.map((o) => [o.visitId, o]));
  const advisedVisits = visits.filter((v) => v.advice.productIds.length > 0);
  const months = [...new Set(advisedVisits.map((v) => v.date.slice(0, 7)))].toSorted();

  return months.map((month) => {
    const inMonth = advisedVisits.filter((v) => v.date.startsWith(month));
    const accepted = inMonth.filter((v) => v.farmerReaction === "accepted").length;
    const followed = inMonth.map((v) => outcomeByVisit.get(v.id)).filter((o): o is Outcome => o !== undefined);
    const controlled = followed.filter((o) => o.result === "controlled").length;
    return {
      month,
      label: MONTH_LABELS[Number(month.slice(5, 7)) - 1] ?? month,
      advised: inMonth.length,
      acceptedPct: pct(accepted, inMonth.length),
      withOutcome: followed.length,
      controlledPct: pct(controlled, followed.length),
    };
  });
}
