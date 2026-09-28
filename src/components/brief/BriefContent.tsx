import clsx from "clsx";
import type { BriefResponse, Product } from "@/types/domain";
import { datesInText, formatDate, formatRupees, humaniseDates } from "@/lib/format";
import { AlertIcon, CheckIcon } from "../Icons";
import { Badge, Card, DateChip, SectionTitle, Skeleton } from "../ui";

interface BriefContentProps {
  data: BriefResponse;
  catalogue: readonly Product[];
  compact?: boolean;
}

const CONFIDENCE_TONE = { high: "leaf", medium: "turmeric", low: "neutral" } as const;

function EvidenceChips({ text }: { text: string }) {
  const dates = datesInText(text);
  if (dates.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {dates.map((d) => (
        <DateChip key={d} date={formatDate(d)} />
      ))}
    </div>
  );
}

function Products({ data, catalogue }: { data: BriefResponse; catalogue: readonly Product[] }) {
  const items = data.brief.recommendedProducts;
  if (items.length === 0) return <p className="text-sm text-muted">No product recommended for this visit.</p>;
  return (
    <ul className="grid gap-3">
      {items.map((r) => {
        const p = catalogue.find((x) => x.id === r.productId);
        return (
          <li key={r.productId} className="rounded-xl border border-line bg-bg/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold leading-snug">{p?.name ?? r.productId}</p>
              {p ? <Badge tone={p.tier === "premium" ? "danger" : p.tier === "standard" ? "sky" : "leaf"}>{p.tier}</Badge> : null}
            </div>
            {p ? (
              <p className="mt-0.5 text-xs text-muted">
                {r.productId} · {formatRupees(p.priceINR)} per {p.packSize} · {p.dosePerAcre} per acre
              </p>
            ) : null}
            <p className="mt-2 text-sm">{humaniseDates(r.why)}</p>
            <p className="mt-1 text-sm text-muted">
              <span className="font-medium text-ink">Evidence: </span>
              {humaniseDates(r.evidence)}
            </p>
            <EvidenceChips text={r.evidence} />
          </li>
        );
      })}
    </ul>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">Nothing specific.</p>;
  return (
    <ul className="grid gap-1.5 text-sm">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
          <span>{humaniseDates(t)}</span>
        </li>
      ))}
    </ul>
  );
}

export function BriefContent({ data, catalogue, compact }: BriefContentProps) {
  const { brief } = data;
  return (
    <div className={clsx("grid", compact ? "gap-3" : "gap-4")}>
      <Card className={clsx(data.memoryEnabled ? "border-leaf/40" : "")}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={CONFIDENCE_TONE[brief.confidence]}>{brief.confidence} confidence</Badge>
          {data.memoryEnabled ? (
            <Badge tone="sky">
              {data.farmerMemories.length} farmer + {data.similarMemories.length} village memories
            </Badge>
          ) : (
            <Badge>no memory used</Badge>
          )}
        </div>
        <p className="mt-2 text-lg font-semibold leading-snug">{humaniseDates(brief.headline)}</p>
        <p className="mt-2 text-sm text-muted">
          <span className="font-medium text-ink">Last visit: </span>
          {humaniseDates(brief.lastVisitSummary)}
        </p>
      </Card>

      <Card>
        <SectionTitle>Recommended products</SectionTitle>
        <Products data={data} catalogue={catalogue} />
      </Card>

      <Card>
        <SectionTitle>How to pitch</SectionTitle>
        <p className="text-sm leading-relaxed">{humaniseDates(brief.howToPitch)}</p>
      </Card>

      <div className={clsx("grid gap-4", !compact && "sm:grid-cols-2")}>
        <Card>
          <SectionTitle>What to check</SectionTitle>
          <BulletList items={brief.whatToCheck} />
        </Card>
        <Card>
          <SectionTitle>Ask the farmer</SectionTitle>
          <BulletList items={brief.openQuestions} />
        </Card>
      </div>

      <Card>
        <SectionTitle hint="each claim shows the visit it came from">What memory says</SectionTitle>
        {brief.claims.length === 0 ? (
          <p className="text-sm text-muted">No remembered facts — there is no history to cite.</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {brief.claims.map((c) => (
              <li key={c.text} className="flex items-start justify-between gap-3">
                <span>{humaniseDates(c.text)}</span>
                {c.sourceVisitDate ? (
                  <DateChip date={formatDate(c.sourceVisitDate)} className="shrink-0" />
                ) : (
                  <Badge className="shrink-0">no source</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data.warnings.length > 0 ? (
        <div className="rounded-2xl border border-turmeric/40 bg-turmeric-soft p-3 text-sm text-ink">
          <p className="flex items-center gap-1.5 font-semibold text-turmeric">
            <AlertIcon className="h-4 w-4" /> Guardrails
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted">
        Generated for {formatDate(data.visitDate)} by {data.model}
        {data.attempts > 1 ? ` (after ${data.attempts} attempts)` : ""}.
      </p>
    </div>
  );
}

export function BriefSkeleton({ memoryEnabled }: { memoryEnabled: boolean }) {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Preparing brief">
      <p className="text-sm text-muted">
        {memoryEnabled ? "Recalling this farmer's history from Hindsight, then writing the brief…" : "Writing the brief without memory…"}
      </p>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  );
}
