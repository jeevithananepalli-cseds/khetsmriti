import type { FarmerSummary } from "@/types/domain";
import { formatDate, titleCase } from "@/lib/format";
import { Badge } from "./ui";

const SENSITIVITY_TONE = { high: "danger", medium: "turmeric", low: "leaf" } as const;

export function FarmerHeader({ summary }: { summary: FarmerSummary }) {
  const { farmer, village } = summary;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{farmer.name}</h1>
          <p className="text-sm text-muted">
            {village.name}, {village.mandal} mandal · {farmer.phone}
          </p>
        </div>
        <span className="rounded-lg bg-surface px-2 py-1 font-mono text-xs text-muted ring-1 ring-line">{farmer.id}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {farmer.crops.map((c) => (
          <Badge key={c} tone="leaf">
            {titleCase(c)}
          </Badge>
        ))}
        <Badge>{farmer.landAcres} acres</Badge>
        <Badge>{farmer.irrigation}</Badge>
        <Badge tone={SENSITIVITY_TONE[farmer.priceSensitivity]}>{farmer.priceSensitivity} price sensitivity</Badge>
        <Badge>{farmer.preferredLanguage === "te" ? "Telugu" : "English"}</Badge>
      </div>
      <p className="mt-2 text-xs text-muted">
        {summary.lastVisitDate
          ? `Last visit ${formatDate(summary.lastVisitDate)} · ${summary.visitCount} visit${summary.visitCount === 1 ? "" : "s"} on record`
          : "No visits on record"}
      </p>
    </div>
  );
}
