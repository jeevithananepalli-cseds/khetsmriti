"use client";

import clsx from "clsx";
import { BrainIcon } from "../Icons";

interface MemoryToggleProps {
  memoryEnabled: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}

/** The big ON/OFF switch that shows what Hindsight memory adds to a brief. */
export function MemoryToggle({ memoryEnabled, onChange, disabled }: MemoryToggleProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border-2 p-3 transition-colors",
        memoryEnabled ? "border-leaf bg-leaf-soft" : "border-line bg-surface",
      )}
    >
      <div className="flex items-center gap-3">
        <BrainIcon className={clsx("h-7 w-7 shrink-0", memoryEnabled ? "text-leaf" : "text-muted")} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Memory {memoryEnabled ? "ON" : "OFF"}</p>
          <p className="text-xs text-muted">
            {memoryEnabled
              ? "Brief uses this farmer's history and similar cases from the village."
              : "Brief uses only the farmer profile and catalogue — no history."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={memoryEnabled}
          aria-label="Memory"
          disabled={disabled}
          onClick={() => onChange(!memoryEnabled)}
          className={clsx(
            "relative h-9 w-16 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:opacity-50",
            memoryEnabled ? "bg-leaf" : "bg-line",
          )}
        >
          <span
            className={clsx(
              "absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all",
              memoryEnabled ? "left-8" : "left-1",
            )}
          />
        </button>
      </div>
    </div>
  );
}
