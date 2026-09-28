"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MemoryEvent, Outcome, OutcomeResult, Product, Visit } from "@/types/domain";
import { apiPost } from "@/lib/clientApi";
import { formatDate, titleCase } from "@/lib/format";
import { Badge, buttonClass, SectionTitle } from "./ui";

const RESULT_TONE: Record<OutcomeResult, "leaf" | "turmeric" | "danger" | "neutral"> = {
  controlled: "leaf",
  partial: "turmeric",
  failed: "danger",
  not_applied: "neutral",
};

const RESULT_LABEL: Record<OutcomeResult, string> = {
  controlled: "Controlled",
  partial: "Partly worked",
  failed: "Failed",
  not_applied: "Not applied",
};

function OutcomeForm({ visit, onSaved }: { visit: Visit; onSaved: () => void }) {
  const [result, setResult] = useState<OutcomeResult>("controlled");
  const [yieldNote, setYieldNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await apiPost<{ outcome: Outcome; memoryEvent: MemoryEvent }>("/api/outcomes", {
      visitId: visit.id,
      applied: result !== "not_applied",
      result,
      yieldNote: yieldNote.trim(),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else setError(res.error.message);
  };

  return (
    <div className="mt-2 grid gap-2 rounded-xl border border-line bg-bg/60 p-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Outcome">
        {(Object.keys(RESULT_LABEL) as OutcomeResult[]).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={result === r}
            onClick={() => setResult(r)}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-medium",
              result === r ? "border-leaf bg-leaf text-white" : "border-line bg-surface text-muted",
            )}
          >
            {RESULT_LABEL[r]}
          </button>
        ))}
      </div>
      <textarea
        value={yieldNote}
        onChange={(e) => setYieldNote(e.target.value)}
        rows={2}
        placeholder="What happened in the field? e.g. spots stopped after second spray"
        aria-label="Outcome note"
        className="w-full rounded-lg border border-line bg-surface p-2 text-sm outline-none focus:border-leaf"
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <button type="button" onClick={save} disabled={saving || yieldNote.trim().length < 3} className={buttonClass.primary}>
        {saving ? "Saving to memory…" : "Save outcome to memory"}
      </button>
    </div>
  );
}

function VisitRow({ visit, outcome, catalogue }: { visit: Visit; outcome?: Outcome; catalogue: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const productNames = visit.advice.productIds.map((id) => catalogue.find((p) => p.id === id)?.name.split(" (")[0] ?? id);
  return (
    <li className="border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono text-xs text-muted">{formatDate(visit.date)}</span>
        <span className="font-medium">
          {titleCase(visit.crop)} · {visit.issue.name}
        </span>
        <Badge tone={visit.farmerReaction === "accepted" ? "leaf" : visit.farmerReaction === "rejected" ? "danger" : "turmeric"}>
          {visit.farmerReaction}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted">
        {productNames.length ? `Advised ${productNames.join(", ")}` : "No product advised"}
        {visit.objection ? ` · Objection: ${visit.objection}` : ""}
      </p>
      {outcome ? (
        <p className="mt-1 text-xs">
          <Badge tone={RESULT_TONE[outcome.result]}>{RESULT_LABEL[outcome.result]}</Badge>{" "}
          <span className="text-muted">
            {formatDate(outcome.followUpDate)} — {outcome.yieldNote}
          </span>
        </p>
      ) : open ? (
        <OutcomeForm
          visit={visit}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="mt-1 text-xs font-semibold text-leaf">
          + Record outcome
        </button>
      )}
    </li>
  );
}

/** Visit records from the data files (not memory), with a way to add the follow-up outcome. */
export function VisitRecords({ visits, outcomes, catalogue }: { visits: Visit[]; outcomes: Outcome[]; catalogue: Product[] }) {
  return (
    <details className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <summary className="cursor-pointer list-none">
        <SectionTitle hint={`${visits.length} visits`}>Visit records</SectionTitle>
      </summary>
      {visits.length === 0 ? (
        <p className="text-sm text-muted">No visits logged yet.</p>
      ) : (
        <ul>
          {visits.toReversed().map((v) => (
            <VisitRow key={v.id} visit={v} outcome={outcomes.find((o) => o.visitId === v.id)} catalogue={catalogue} />
          ))}
        </ul>
      )}
    </details>
  );
}
