"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import type { FarmerSummary, Village } from "@/types/domain";
import { formatDate, titleCase } from "@/lib/format";
import { SearchIcon } from "./Icons";
import { Badge, EmptyState, LinkButton } from "./ui";

interface FarmersListProps {
  farmers: FarmerSummary[];
  villages: Village[];
}

const SENSITIVITY_TONE = { high: "danger", medium: "turmeric", low: "leaf" } as const;

function FarmerCard({ s }: { s: FarmerSummary }) {
  const { farmer, village } = s;
  return (
    <li className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{farmer.name}</h3>
          <p className="text-sm text-muted">
            {village.name} · {farmer.landAcres} acres · {farmer.irrigation}
          </p>
        </div>
        <span className="font-mono text-xs text-muted">{farmer.id}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {farmer.crops.map((c) => (
          <Badge key={c} tone="leaf">
            {titleCase(c)}
          </Badge>
        ))}
        <Badge tone={SENSITIVITY_TONE[farmer.priceSensitivity]}>{farmer.priceSensitivity} price sensitivity</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {s.lastVisitDate ? (
            <>
              Last visit <b className="text-ink">{formatDate(s.lastVisitDate)}</b> · {s.visitCount} visit{s.visitCount === 1 ? "" : "s"}
            </>
          ) : (
            "No visits yet"
          )}
        </p>
        <LinkButton href={`/farmers/${farmer.id}`} className="shrink-0 px-3 py-2">
          Prepare visit
        </LinkButton>
      </div>
    </li>
  );
}

export function FarmersList({ farmers, villages }: FarmersListProps) {
  const [query, setQuery] = useState("");
  const [villageId, setVillageId] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return farmers.filter(
      (s) =>
        (villageId === "all" || s.village.id === villageId) &&
        (!q ||
          s.farmer.name.toLowerCase().includes(q) ||
          s.farmer.id.toLowerCase().includes(q) ||
          s.farmer.crops.some((c) => c.includes(q))),
    );
  }, [farmers, query, villageId]);

  return (
    <div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search farmer, id or crop"
          aria-label="Search farmers"
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf-soft"
        />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Filter by village">
        {[{ id: "all", name: "All villages" }, ...villages].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVillageId(v.id)}
            aria-pressed={villageId === v.id}
            className={clsx(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium",
              villageId === v.id ? "border-leaf bg-leaf text-white" : "border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {v.name}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No farmers match">Try another name, or clear the village filter.</EmptyState>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {filtered.map((s) => (
            <FarmerCard key={s.farmer.id} s={s} />
          ))}
        </ul>
      )}
    </div>
  );
}
