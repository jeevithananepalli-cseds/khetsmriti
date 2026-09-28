import type { MemoryHit } from "@/types/domain";
import { formatDate } from "@/lib/format";
import { Badge } from "../ui";

const TYPE_TONE = { observation: "turmeric", experience: "sky", world: "neutral" } as const;

function HitList({ hits }: { hits: MemoryHit[] }) {
  if (hits.length === 0) return <p className="text-sm text-muted">None.</p>;
  return (
    <ul className="grid gap-2">
      {hits.map((h) => (
        <li key={h.id} className="rounded-lg border border-line bg-bg/60 p-2.5 text-sm">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {h.type ? <Badge tone={TYPE_TONE[h.type]}>{h.type}</Badge> : null}
            {h.occurredAt ? <span className="font-mono text-xs text-muted">{formatDate(h.occurredAt)}</span> : null}
            {h.documentId ? <span className="font-mono text-xs text-soil">{h.documentId}</span> : null}
          </div>
          <p className="leading-snug">{h.text.split(" | ")[0]}</p>
        </li>
      ))}
    </ul>
  );
}

/** Shows exactly which memories Hindsight returned for this brief. */
export function RecalledMemories({ farmer, similar }: { farmer: MemoryHit[]; similar: MemoryHit[] }) {
  return (
    <details className="group rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <summary className="cursor-pointer list-none text-sm font-semibold">
        <span className="text-leaf">Show recalled memories</span>{" "}
        <span className="font-normal text-muted">
          ({farmer.length} about this farmer, {similar.length} similar cases)
        </span>
      </summary>
      <div className="mt-3 grid gap-4">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">This farmer</h3>
          <HitList hits={farmer.slice(0, 15)} />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Similar cases in the village</h3>
          <HitList hits={similar.slice(0, 10)} />
        </div>
      </div>
    </details>
  );
}
