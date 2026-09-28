"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import type { Farmer, MemoryEvent, Product, Visit, VisitStructured } from "@/types/domain";
import { apiPost } from "@/lib/clientApi";
import { formatDate } from "@/lib/format";
import { CheckIcon, MicIcon, PenIcon } from "../Icons";
import { Badge, buttonClass, Card, ErrorState, SectionTitle } from "../ui";
import { StructuredVisitForm } from "./StructuredVisitForm";
import { VoiceRecorder } from "./VoiceRecorder";

interface StructureDraft {
  structured: VisitStructured;
  unknownProducts: string[];
  warnings: string[];
  noteLanguage: "te" | "en" | "mixed";
}

interface SavedVisit {
  visit: Visit;
  memoryEvent: MemoryEvent;
}

type Step =
  | { name: "note" }
  | { name: "structuring" }
  | { name: "review"; draft: StructureDraft }
  | { name: "saving"; draft: StructureDraft }
  | { name: "saved"; saved: SavedVisit };

export function LogVisitFlow({ farmer, catalogue }: { farmer: Farmer; catalogue: Product[] }) {
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<Step>({ name: "note" });
  const [structured, setStructured] = useState<VisitStructured | null>(null);
  const [error, setError] = useState<string | null>(null);

  const structure = async () => {
    setError(null);
    setStep({ name: "structuring" });
    const res = await apiPost<StructureDraft>("/api/visits/structure", { farmerId: farmer.id, note });
    if (res.ok) {
      setStructured(res.data.structured);
      setStep({ name: "review", draft: res.data });
    } else {
      setError(res.error.message);
      setStep({ name: "note" });
    }
  };

  const save = async (draft: StructureDraft) => {
    if (!structured) return;
    setError(null);
    setStep({ name: "saving", draft });
    const res = await apiPost<SavedVisit>("/api/visits", { farmerId: farmer.id, note, structured });
    if (res.ok) setStep({ name: "saved", saved: res.data });
    else {
      setError(res.error.message);
      setStep({ name: "review", draft });
    }
  };

  if (step.name === "saved") {
    const { visit, memoryEvent } = step.saved;
    return (
      <Card className="border-leaf/50">
        <p className="flex items-center gap-2 text-lg font-semibold text-leaf">
          <CheckIcon className="h-5 w-5" /> Saved to memory
        </p>
        <p className="mt-1 text-sm text-muted">
          Visit {visit.id} on {formatDate(visit.date)} was retained in Hindsight in {memoryEvent.latencyMs.toLocaleString("en-IN")} ms
          with these tags:
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {memoryEvent.tags.map((t) => (
            <span key={t} className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs text-soil ring-1 ring-line">
              {t}
            </span>
          ))}
        </div>
        <Link href={`/farmers/${farmer.id}`} className={clsx(buttonClass.primary, "mt-4 w-full")}>
          Back to {farmer.name.split(" ")[0]}&apos;s brief
        </Link>
      </Card>
    );
  }

  if (step.name === "review" || step.name === "saving") {
    const { draft } = step;
    return (
      <div className="grid gap-4">
        <Card>
          <SectionTitle hint={draft.noteLanguage === "en" ? "English note" : draft.noteLanguage === "te" ? "Telugu note" : "Mixed note"}>
            Check before saving
          </SectionTitle>
          {structured ? (
            <StructuredVisitForm value={structured} onChange={setStructured} crops={farmer.crops} catalogue={catalogue} />
          ) : null}
        </Card>
        {draft.warnings.length > 0 ? (
          <div className="rounded-2xl border border-turmeric/40 bg-turmeric-soft p-3 text-sm">
            <p className="font-semibold text-turmeric">Flagged</p>
            <ul className="mt-1 list-disc pl-5 text-xs">
              {draft.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {error ? <ErrorState title="Could not save" message={error} /> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => setStep({ name: "note" })} className={buttonClass.secondary} disabled={step.name === "saving"}>
            Edit note
          </button>
          <button type="button" onClick={() => void save(draft)} className={buttonClass.primary} disabled={step.name === "saving"}>
            {step.name === "saving" ? "Saving to memory…" : "Save to memory"}
          </button>
        </div>
      </div>
    );
  }

  const busy = step.name === "structuring";
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1" role="tablist">
        {(["voice", "text"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={clsx(
              "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold",
              mode === m ? "bg-surface text-ink shadow-sm" : "text-muted",
            )}
          >
            {m === "voice" ? <MicIcon /> : <PenIcon />} {m === "voice" ? "Voice" : "Type"}
          </button>
        ))}
      </div>

      {mode === "voice" ? (
        <VoiceRecorder
          onTranscript={(text) => {
            setNote((prev) => (prev ? `${prev}\n${text}` : text));
          }}
        />
      ) : null}

      <label className="grid gap-1">
        <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
          {mode === "voice" ? "Transcript (you can edit it)" : "Visit note"}
          {note ? <Badge>{note.trim().split(/\s+/).length} words</Badge> : null}
        </span>
        <textarea
          rows={6}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Chilli leaf blight again at flowering. Advised Blitox 500 g per acre. Farmer said price is fine, agreed."
          className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-leaf"
        />
      </label>

      {error ? <ErrorState title="Could not read the note" message={error} /> : null}

      <button type="button" onClick={() => void structure()} disabled={busy || note.trim().length < 5} className={buttonClass.primary}>
        {busy ? "Structuring the note…" : "Structure note"}
      </button>
    </div>
  );
}
