"use client";

import type { Product } from "@/types/domain";
import { useMemoryMode } from "../MemoryMode";
import { RefreshIcon } from "../Icons";
import { buttonClass, ErrorState } from "../ui";
import { BriefContent, BriefSkeleton } from "./BriefContent";
import { MemoryToggle } from "./MemoryToggle";
import { RecalledMemories } from "./RecalledMemories";
import { useBrief } from "./useBrief";

export function BriefView({ farmerId, catalogue }: { farmerId: string; catalogue: Product[] }) {
  const { memoryEnabled, setMemoryEnabled } = useMemoryMode();
  const { state, refresh } = useBrief(farmerId, memoryEnabled);

  return (
    <div className="grid gap-4">
      <MemoryToggle memoryEnabled={memoryEnabled} onChange={setMemoryEnabled} disabled={state.status === "loading"} />

      {state.status === "loading" ? <BriefSkeleton memoryEnabled={memoryEnabled} /> : null}
      {state.status === "error" ? (
        <ErrorState title="Could not prepare the brief" message={state.error.message} onRetry={refresh} />
      ) : null}
      {state.status === "ready" ? (
        <>
          <BriefContent data={state.data} catalogue={catalogue} />
          {state.data.memoryEnabled ? (
            <RecalledMemories farmer={state.data.farmerMemories} similar={state.data.similarMemories} />
          ) : null}
          <button type="button" onClick={refresh} className={buttonClass.secondary}>
            <RefreshIcon /> Regenerate brief
          </button>
        </>
      ) : null}
    </div>
  );
}
