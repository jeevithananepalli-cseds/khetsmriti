import type { MemoryEvent } from "@/types/domain";

// In-memory ring buffer of the last Hindsight calls, read by the Memory panel.
// Kept on globalThis so all route handlers (and dev hot reloads) share one log.

const MAX_EVENTS = 100;

interface MemoryLogState {
  events: readonly MemoryEvent[];
  nextId: number;
}

const globalForLog = globalThis as typeof globalThis & { __khetMemoryLog?: MemoryLogState };

function state(): MemoryLogState {
  if (!globalForLog.__khetMemoryLog) {
    globalForLog.__khetMemoryLog = { events: [], nextId: 1 };
  }
  return globalForLog.__khetMemoryLog;
}

export function logMemoryEvent(event: Omit<MemoryEvent, "id">): MemoryEvent {
  const current = state();
  const entry: MemoryEvent = { ...event, id: current.nextId };
  globalForLog.__khetMemoryLog = {
    events: [...current.events, entry].slice(-MAX_EVENTS),
    nextId: current.nextId + 1,
  };
  return entry;
}

/** Events newest-first; pass `afterId` to get only events newer than the last one seen. */
export function getMemoryEvents(afterId = 0): MemoryEvent[] {
  return state()
    .events.filter((e) => e.id > afterId)
    .toReversed();
}
