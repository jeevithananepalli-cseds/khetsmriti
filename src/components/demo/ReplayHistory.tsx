"use client";

import clsx from "clsx";
import { useState } from "react";
import type { ApiError, BriefResponse, MemoryEvent, Product } from "@/types/domain";
import { apiPost } from "@/lib/clientApi";
import { formatDate } from "@/lib/format";
import { BriefContent, BriefSkeleton } from "../brief/BriefContent";
import { CheckIcon } from "../Icons";
import { Badge, buttonClass, Card, ErrorState, SectionTitle } from "../ui";

export interface ReplayStepInfo {
  index: number;
  visitId: string;
  date: string;
  label: string;
  nextVisitDate: string;
}

type BriefState = { status: "idle" } | { status: "loading" } | { status: "error"; error: ApiError } | { status: "ready"; data: BriefResponse };

interface ReplayHistoryProps {
  farmerId: string;
  farmerName: string;
  steps: ReplayStepInfo[];
  catalogue: Product[];
  onMemoryChanged: () => void;
}

/**
 * Clears the demo farmer's memory, then retains their visits one at a time and regenerates the
 * Memory ON brief after each step so the audience sees it sharpen.
 */
export function ReplayHistory({ farmerId, farmerName, steps, catalogue, onMemoryChanged }: ReplayHistoryProps) {
  const [done, setDone] = useState(-1); // index of the last retained step; -1 = nothing yet
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<BriefState>({ status: "idle" });

  const loadBrief = async (visitDate: string) => {
    setBrief({ status: "loading" });
    const res = await apiPost<BriefResponse>("/api/brief", { farmerId, memoryEnabled: true, visitDate });
    setBrief(res.ok ? { status: "ready", data: res.data } : { status: "error", error: res.error });
  };

  const start = async () => {
    setError(null);
    setBusy("Clearing this farmer's memory…");
    const res = await apiPost<{ steps: ReplayStepInfo[] }>("/api/demo", { action: "replay-start" });
    setBusy(null);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setStarted(true);
    setDone(-1);
    onMemoryChanged();
    await loadBrief(steps[0]?.date ?? "");
  };

  const next = async () => {
    const index = done + 1;
    const step = steps[index];
    if (!step) return;
    setError(null);
    setBusy(`Retaining visit ${step.visitId}…`);
    const res = await apiPost<{ step: ReplayStepInfo; event: MemoryEvent }>("/api/demo", { action: "replay-step", step: index });
    setBusy(null);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setDone(index);
    if (index === steps.length - 1) onMemoryChanged();
    await loadBrief(step.nextVisitDate);
  };

  const finished = started && done === steps.length - 1;
  const upcoming = steps[done + 1];
  const briefDate = done >= 0 ? steps[done]?.nextVisitDate : steps[0]?.date;

  return (
    <Card>
      <SectionTitle hint={`${steps.length} visits`}>Replay {farmerName}&apos;s history</SectionTitle>
      <p className="text-sm text-muted">
        Starts from an empty memory for {farmerName}, then retains one visit (and its outcome) at a time. After each step the
        brief for the <b>next</b> visit is regenerated from memory.
      </p>

      <ol className="mt-3 grid gap-1.5">
        {steps.map((s) => {
          const state = !started ? "pending" : s.index <= done ? "done" : s.index === done + 1 ? "next" : "pending";
          return (
            <li
              key={s.visitId}
              className={clsx(
                "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm",
                state === "done" && "border-leaf/40 bg-leaf-soft",
                state === "next" && "border-turmeric bg-turmeric-soft",
                state === "pending" && "border-line",
              )}
            >
              <span
                className={clsx(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  state === "done" ? "bg-leaf text-white" : "bg-line text-muted",
                )}
              >
                {state === "done" ? <CheckIcon className="h-3 w-3" /> : s.index + 1}
              </span>
              <span className="font-mono text-xs text-muted">{formatDate(s.date)}</span>
              <span className="min-w-0 truncate">{s.label}</span>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div className="mt-3">
          <ErrorState title="Replay step failed" message={error} />
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => void start()} disabled={busy !== null} className={buttonClass.secondary}>
          {started ? "Restart replay" : "Start replay (clears memory)"}
        </button>
        <button
          type="button"
          onClick={() => void next()}
          disabled={!started || finished || busy !== null || brief.status === "loading"}
          className={buttonClass.primary}
        >
          {finished ? "Replay complete" : upcoming ? `Retain visit ${done + 2} of ${steps.length}` : "Next visit"}
        </button>
      </div>
      {busy ? <p className="mt-2 text-xs text-muted" aria-live="polite">{busy}</p> : null}

      {started ? (
        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Brief for the visit on {formatDate(briefDate ?? "")}</h3>
            <Badge tone="sky">{done + 1} of {steps.length} visits in memory</Badge>
          </div>
          {brief.status === "loading" ? <BriefSkeleton memoryEnabled /> : null}
          {brief.status === "error" ? <ErrorState title="Brief failed" message={brief.error.message} /> : null}
          {brief.status === "ready" ? <BriefContent data={brief.data} catalogue={catalogue} compact /> : null}
        </div>
      ) : null}
    </Card>
  );
}
