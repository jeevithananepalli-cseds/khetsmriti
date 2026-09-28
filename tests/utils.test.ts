import { describe, expect, it } from "vitest";
import type { MemoryEvent } from "@/types/domain";
import { datesInText, formatDate, formatRupees, humaniseDates, timeAgo } from "@/lib/format";
import { learningCurve } from "@/lib/learningCurve";
import { getMemoryEvents, logMemoryEvent } from "@/lib/memoryLog";
import { createRateLimiter } from "@/lib/rateLimit";
import { guessCropStage } from "@/lib/season";
import { outcome, visit } from "./fixtures";

describe("format", () => {
  it("formats dates as 12 Apr 2026 and rupees with Indian grouping", () => {
    expect(formatDate("2026-04-12")).toBe("12 Apr 2026");
    expect(formatDate("2026-09-06T10:00:00Z")).toBe("6 Sep 2026");
    expect(formatDate("not a date")).toBe("not a date");
    expect(formatRupees(1240)).toBe("₹1,240");
    expect(formatRupees(125000)).toBe("₹1,25,000");
  });

  it("finds and humanises dates inside text", () => {
    expect(datesInText("on 2026-04-08 and 2026-04-21, again 2026-04-08")).toEqual(["2026-04-08", "2026-04-21"]);
    expect(humaniseDates("seen 2026-04-08")).toBe("seen 8 Apr 2026");
  });

  it("describes elapsed time briefly", () => {
    const now = Date.parse("2026-09-28T10:00:00Z");
    expect(timeAgo("2026-09-28T09:59:58Z", now)).toBe("just now");
    expect(timeAgo("2026-09-28T09:59:30Z", now)).toBe("30s ago");
    expect(timeAgo("2026-09-28T09:50:00Z", now)).toBe("10m ago");
  });
});

describe("learningCurve", () => {
  it("computes monthly acceptance and control rates for advised visits only", () => {
    const visits = [
      visit,
      { ...visit, id: "V003", date: "2026-04-20", farmerReaction: "accepted" as const },
      { ...visit, id: "V004", date: "2026-05-02", advice: { productIds: [], note: "none" } },
    ];
    const outcomes = [outcome, { ...outcome, visitId: "V003", applied: true, result: "controlled" as const }];
    expect(learningCurve(visits, outcomes)).toEqual([
      { month: "2026-04", label: "Apr", advised: 2, acceptedPct: 50, withOutcome: 2, controlledPct: 50 },
    ]);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit per window, then reports when to retry", () => {
    let t = 0;
    const check = createRateLimiter({ limit: 2, windowMs: 10_000 }, () => t);
    expect(check("a").allowed).toBe(true);
    expect(check("a").allowed).toBe(true);
    const blocked = check("a");
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 10 });
    expect(check("b").allowed).toBe(true);
    t = 10_000;
    expect(check("a").allowed).toBe(true);
  });
});

describe("memory event log", () => {
  it("keeps the newest 100 events, newest first, and supports incremental reads", () => {
    const base: Omit<MemoryEvent, "id"> = { op: "recall", ok: true, tags: [], summary: "", latencyMs: 1, at: "" };
    const first = logMemoryEvent({ ...base, summary: "first" });
    for (let i = 0; i < 105; i++) logMemoryEvent({ ...base, summary: `e${i}` });
    const events = getMemoryEvents();
    expect(events).toHaveLength(100);
    expect(events[0]?.summary).toBe("e104");
    expect(events.some((e) => e.id === first.id)).toBe(false);
    expect(getMemoryEvents(events[1]!.id).map((e) => e.summary)).toEqual(["e104"]);
  });
});

describe("season", () => {
  it("guesses a crop stage from the month and admits unknown crops", () => {
    expect(guessCropStage("cotton", "2026-08-15")).toBe("squaring / flowering");
    expect(guessCropStage("paddy", "2026-09-10")).toBe("panicle initiation / booting");
    expect(guessCropStage("tomato", "2026-08-15")).toMatch(/unknown/);
  });
});
