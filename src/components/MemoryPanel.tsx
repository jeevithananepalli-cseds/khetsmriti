"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type { MemoryEvent, MemoryOp } from "@/types/domain";
import { apiGet } from "@/lib/clientApi";
import { timeAgo } from "@/lib/format";
import { BrainIcon, ChevronIcon } from "./Icons";

// Live feed of every Hindsight retain / recall / reflect. Right-hand drawer on desktop, bottom sheet on phones.

const POLL_MS = 2000;

const OP_STYLE: Record<MemoryOp, { label: string; className: string }> = {
  retain: { label: "RETAIN", className: "bg-leaf text-white" },
  recall: { label: "RECALL", className: "bg-sky text-white" },
  reflect: { label: "REFLECT", className: "bg-turmeric text-white" },
};

function useMemoryEvents() {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await apiGet<MemoryEvent[]>("/api/memory/events");
      if (cancelled) return;
      setOnline(res.ok);
      if (res.ok) setEvents(res.data);
    };
    // Skip background polling while the tab is hidden, and catch up as soon as it is visible again.
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { events, online };
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

function EventRow({ event, fresh, now }: { event: MemoryEvent; fresh: boolean; now: number }) {
  const op = OP_STYLE[event.op];
  return (
    <li className={clsx("border-b border-line px-4 py-3 last:border-b-0", fresh && "animate-event-in")}>
      <div className="flex items-center gap-2">
        <span className={clsx("rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider", op.className)}>
          {op.label}
        </span>
        {!event.ok ? <span className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">FAILED</span> : null}
        <span className="ml-auto font-mono text-[11px] text-muted">
          {event.latencyMs.toLocaleString("en-IN")} ms · {timeAgo(event.at, now)}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-snug text-ink">{event.summary}</p>
      {event.tags.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {event.tags.map((t) => (
            <span key={t} className="rounded bg-bg px-1.5 py-0.5 font-mono text-[11px] text-soil ring-1 ring-line">
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </li>
  );
}

function EventList({ events, seen, now }: { events: MemoryEvent[]; seen: ReadonlySet<number>; now: number }) {
  if (events.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted">
        No memory activity yet. Open a farmer&apos;s brief with Memory ON to watch recall happen here.
      </p>
    );
  }
  return (
    <ul>
      {events.map((e) => (
        <EventRow key={e.id} event={e} fresh={!seen.has(e.id)} now={now} />
      ))}
    </ul>
  );
}

function Counts({ events }: { events: MemoryEvent[] }) {
  const count = (op: MemoryOp) => events.filter((e) => e.op === op).length;
  return (
    <div className="flex gap-3 font-mono text-[11px] text-muted">
      <span><b className="text-leaf">{count("retain")}</b> retain</span>
      <span><b className="text-sky">{count("recall")}</b> recall</span>
      <span><b className="text-turmeric">{count("reflect")}</b> reflect</span>
    </div>
  );
}

export function MemoryPanel() {
  const { events, online } = useMemoryEvents();
  const now = useNow(5000);
  const [open, setOpen] = useState(false);
  // Ids rendered before this poll; anything not in here gets the "new" highlight once.
  const seenRef = useRef<Set<number>>(new Set());
  const [seen, setSeen] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      events.forEach((e) => seenRef.current.add(e.id));
      setSeen(new Set(seenRef.current));
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [events]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const latest = events[0];
  const status = (
    <span className="flex items-center gap-1.5 text-[11px] text-muted">
      <span className={clsx("h-2 w-2 rounded-full", online ? "animate-pulse-dot bg-leaf" : "bg-danger")} />
      {online ? "live" : "offline"}
    </span>
  );

  return (
    <>
      {/* Desktop: fixed right drawer */}
      <aside
        aria-label="Memory activity"
        className="fixed inset-y-0 right-0 z-30 hidden w-[380px] flex-col border-l border-line bg-surface lg:flex"
      >
        <div className="border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <BrainIcon className="h-5 w-5 text-leaf" />
            <h2 className="font-semibold">Memory</h2>
            <span className="text-xs text-muted">Hindsight</span>
            <span className="ml-auto">{status}</span>
          </div>
          <div className="mt-2">
            <Counts events={events} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <EventList events={events} seen={seen} now={now} />
        </div>
      </aside>

      {/* Mobile: bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        {open ? <button type="button" aria-label="Close memory panel" className="fixed inset-0 bg-ink/30" onClick={() => setOpen(false)} /> : null}
        <div className="relative rounded-t-2xl border-t border-line bg-surface shadow-[0_-8px_24px_rgba(42,33,24,0.12)]">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex w-full items-center gap-2 px-4 py-3 text-left"
          >
            <BrainIcon className="h-5 w-5 shrink-0 text-leaf" />
            <span className="font-semibold">Memory</span>
            {latest ? (
              <span className="min-w-0 flex-1 truncate text-xs text-muted">
                <b className="font-mono">{OP_STYLE[latest.op].label}</b> {latest.summary}
              </span>
            ) : (
              <span className="flex-1 text-xs text-muted">no activity yet</span>
            )}
            {status}
            <ChevronIcon className={clsx("h-4 w-4 shrink-0 transition-transform", !open && "rotate-180")} />
          </button>
          {open ? (
            <div className="max-h-[65vh] overflow-y-auto border-t border-line">
              <div className="px-4 py-2">
                <Counts events={events} />
              </div>
              <EventList events={events} seen={seen} now={now} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
