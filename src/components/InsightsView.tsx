"use client";

import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import type { ApiError, InsightKey, InsightsResponse, Village, VillageInsight } from "@/types/domain";
import { apiGet } from "@/lib/clientApi";
import { formatDate, titleCase } from "@/lib/format";
import { Markdown } from "./Markdown";
import { Badge, Card, ErrorState, Skeleton } from "./ui";

const TITLES: Record<InsightKey, string> = {
  what_works: "What works",
  objections: "Handling objections",
  watch_next: "Watch next month",
};

type State = { status: "loading" } | { status: "error"; error: ApiError } | { status: "ready"; data: InsightsResponse };

function InsightCard({ insight }: { insight: VillageInsight }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">{TITLES[insight.key]}</h2>
      <p className="mt-0.5 text-xs text-muted">{insight.question}</p>
      <div className="mt-3">
        {insight.error ? (
          <ErrorState title="Hindsight could not answer" message={insight.error} />
        ) : (
          <Markdown text={insight.answer} />
        )}
      </div>
      {insight.sources.length > 0 ? (
        <details className="mt-3 border-t border-line pt-2">
          <summary className="cursor-pointer text-xs font-semibold text-leaf">
            Based on {insight.sources.length} memories
          </summary>
          <ul className="mt-2 grid gap-1.5">
            {insight.sources.slice(0, 12).map((s, i) => (
              <li key={s.id ?? i} className="text-xs text-muted">
                {s.occurredAt ? <span className="font-mono text-soil">{formatDate(s.occurredAt)} · </span> : null}
                {s.text.split(" | ")[0]}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}

export function InsightsView({ villages }: { villages: Village[] }) {
  const [villageSlug, setVillageSlug] = useState(villages[0]?.slug ?? "");
  const village = villages.find((v) => v.slug === villageSlug);
  const [crop, setCrop] = useState<string>(village?.dominantCrops[0] ?? "");
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    if (!villageSlug) return;
    setState({ status: "loading" });
    const qs = new URLSearchParams({ village: villageSlug, ...(crop ? { crop } : {}) });
    const res = await apiGet<InsightsResponse>(`/api/insights?${qs.toString()}`);
    setState(res.ok ? { status: "ready", data: res.data } : { status: "error", error: res.error });
  }, [villageSlug, crop]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickVillage = (slug: string) => {
    setVillageSlug(slug);
    setCrop(villages.find((v) => v.slug === slug)?.dominantCrops[0] ?? "");
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Village">
          {villages.map((v) => (
            <button
              key={v.slug}
              type="button"
              aria-pressed={v.slug === villageSlug}
              onClick={() => pickVillage(v.slug)}
              className={clsx(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium",
                v.slug === villageSlug ? "border-leaf bg-leaf text-white" : "border-line bg-surface text-muted",
              )}
            >
              {v.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Crop">
          {(village?.dominantCrops ?? []).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === crop}
              onClick={() => setCrop(c)}
              className={clsx(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                c === crop ? "border-soil bg-soil text-white" : "border-line bg-surface text-muted",
              )}
            >
              {titleCase(c)}
            </button>
          ))}
        </div>
      </div>

      {state.status === "loading" ? (
        <div className="grid gap-4" aria-busy="true">
          <p className="text-sm text-muted">Hindsight is reflecting on everything remembered in {village?.name}… (about 10–20 s)</p>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : null}
      {state.status === "error" ? (
        <ErrorState title="Could not load insights" message={state.error.message} onRetry={() => void load()} />
      ) : null}
      {state.status === "ready" ? (
        <>
          <p className="flex items-center gap-2 text-xs text-muted">
            {state.data.cached ? <Badge tone="sky">cached</Badge> : <Badge tone="leaf">fresh</Badge>}
            Generated {new Date(state.data.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
          {state.data.insights.map((i) => (
            <InsightCard key={i.key} insight={i} />
          ))}
        </>
      ) : null}
    </div>
  );
}
