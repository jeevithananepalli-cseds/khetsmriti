"use client";

import clsx from "clsx";
import type { Product } from "@/types/domain";
import { BriefContent, BriefSkeleton } from "../brief/BriefContent";
import { useBrief } from "../brief/useBrief";
import { BrainIcon, RefreshIcon } from "../Icons";
import { ErrorState } from "../ui";

function Column({ farmerId, memoryEnabled, catalogue, refreshKey }: {
  farmerId: string;
  memoryEnabled: boolean;
  catalogue: Product[];
  refreshKey: number;
}) {
  const { state, refresh } = useBrief(farmerId, memoryEnabled, refreshKey);
  return (
    <div className="grid content-start gap-3">
      <div
        className={clsx(
          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold",
          memoryEnabled ? "bg-leaf text-white" : "bg-line text-ink",
        )}
      >
        <BrainIcon className="h-5 w-5" />
        Memory {memoryEnabled ? "ON" : "OFF"}
        <button
          type="button"
          onClick={refresh}
          aria-label={`Regenerate memory ${memoryEnabled ? "on" : "off"} brief`}
          className="ml-auto rounded-lg p-1 hover:bg-white/20"
        >
          <RefreshIcon />
        </button>
      </div>
      {state.status === "loading" ? <BriefSkeleton memoryEnabled={memoryEnabled} /> : null}
      {state.status === "error" ? <ErrorState title="Brief failed" message={state.error.message} onRetry={refresh} /> : null}
      {state.status === "ready" ? <BriefContent data={state.data} catalogue={catalogue} compact /> : null}
    </div>
  );
}

/** The same farmer's brief with and without memory, generated from identical inputs otherwise. */
export function SideBySide({ farmerId, catalogue, refreshKey }: { farmerId: string; catalogue: Product[]; refreshKey: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Memory OFF never depends on memory, so it is not refreshed when memory changes. */}
      <Column farmerId={farmerId} memoryEnabled={false} catalogue={catalogue} refreshKey={0} />
      <Column farmerId={farmerId} memoryEnabled catalogue={catalogue} refreshKey={refreshKey} />
    </div>
  );
}
