"use client";

import { useState } from "react";
import type { MemoryEvent, Product } from "@/types/domain";
import type { LearningPoint } from "@/lib/learningCurve";
import { apiPost } from "@/lib/clientApi";
import { RefreshIcon } from "../Icons";
import { buttonClass, Card, ErrorState, SectionTitle } from "../ui";
import { LearningCurveChart } from "./LearningCurveChart";
import { ReplayHistory, type ReplayStepInfo } from "./ReplayHistory";
import { SideBySide } from "./SideBySide";

interface DemoViewProps {
  farmerId: string;
  farmerName: string;
  steps: ReplayStepInfo[];
  catalogue: Product[];
  curve: LearningPoint[];
}

export function DemoView({ farmerId, farmerName, steps, catalogue, curve }: DemoViewProps) {
  // Bumped whenever the demo farmer's memory changes, so the side-by-side briefs are regenerated.
  const [memoryVersion, setMemoryVersion] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const reset = async () => {
    setResetting(true);
    setResetError(null);
    const res = await apiPost<{ event: MemoryEvent }>("/api/demo", { action: "reset" });
    setResetting(false);
    if (!res.ok) {
      setResetError(res.error.message);
      return;
    }
    setReplayKey((k) => k + 1);
    setMemoryVersion((v) => v + 1);
  };

  return (
    <div className="grid gap-6">
      <section>
        <SectionTitle hint={`${farmerName} · ${farmerId}`}>1 · Same farmer, memory off vs on</SectionTitle>
        <SideBySide farmerId={farmerId} catalogue={catalogue} refreshKey={memoryVersion} />
      </section>

      <section>
        <ReplayHistory
          key={replayKey}
          farmerId={farmerId}
          farmerName={farmerName}
          steps={steps}
          catalogue={catalogue}
          onMemoryChanged={() => setMemoryVersion((v) => v + 1)}
        />
      </section>

      <section>
        <LearningCurveChart points={curve} />
      </section>

      <Card>
        <SectionTitle>Reset demo</SectionTitle>
        <p className="text-sm text-muted">
          Re-seeds {farmerName}&apos;s full visit history in Hindsight (by document id) and removes any visits logged for them during
          the demo. Other farmers are not touched.
        </p>
        {resetError ? (
          <div className="mt-3">
            <ErrorState title="Reset failed" message={resetError} />
          </div>
        ) : null}
        <button type="button" onClick={() => void reset()} disabled={resetting} className={`${buttonClass.secondary} mt-3 w-full`}>
          <RefreshIcon /> {resetting ? "Re-seeding memory…" : "Reset demo"}
        </button>
      </Card>
    </div>
  );
}
