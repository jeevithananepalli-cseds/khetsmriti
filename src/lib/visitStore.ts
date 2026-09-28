import "server-only";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { Outcome, Visit } from "@/types/domain";
import { seedOutcomes, seedVisits } from "./data";
import { outcomeSchema, visitSchema } from "./dataSchemas";

// Visits = seed history (read-only JSON) + visits logged in the app (data/visits.runtime.json).

const RUNTIME_FILE = join(process.cwd(), "data", "visits.runtime.json");

const runtimeFileSchema = z.object({
  visits: z.array(visitSchema),
  outcomes: z.array(outcomeSchema),
});

type RuntimeData = z.infer<typeof runtimeFileSchema>;

const EMPTY: RuntimeData = { visits: [], outcomes: [] };

async function readRuntime(): Promise<RuntimeData> {
  let raw: string;
  try {
    raw = await readFile(RUNTIME_FILE, "utf8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return EMPTY;
    throw err;
  }
  const parsed = runtimeFileSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error(`data/visits.runtime.json is invalid: ${parsed.error.message}`);
  return parsed.data;
}

// Serialise writes so two quick saves can't overwrite each other.
let writeChain: Promise<unknown> = Promise.resolve();

function updateRuntime<T>(change: (current: RuntimeData) => { next: RuntimeData; result: T }): Promise<T> {
  const run = writeChain.then(async () => {
    const { next, result } = change(await readRuntime());
    await writeFile(RUNTIME_FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export async function allVisits(): Promise<Visit[]> {
  const runtime = await readRuntime();
  return [...seedVisits, ...runtime.visits].toSorted((a, b) => a.date.localeCompare(b.date));
}

export async function allOutcomes(): Promise<Outcome[]> {
  const runtime = await readRuntime();
  return [...seedOutcomes, ...runtime.outcomes];
}

export async function visitsForFarmer(farmerId: string): Promise<Visit[]> {
  return (await allVisits()).filter((v) => v.farmerId === farmerId);
}

export async function findVisit(visitId: string): Promise<Visit | undefined> {
  return (await allVisits()).find((v) => v.id === visitId);
}

function nextVisitId(visits: readonly Visit[]): string {
  const max = visits.reduce((m, v) => Math.max(m, Number(v.id.slice(1)) || 0), 0);
  return `V${String(max + 1).padStart(3, "0")}`;
}

/** Saves a newly logged visit, assigning the next V### id. */
export async function addVisit(visit: Omit<Visit, "id">): Promise<Visit> {
  return updateRuntime((current) => {
    const saved: Visit = { ...visit, id: nextVisitId([...seedVisits, ...current.visits]) };
    return { next: { ...current, visits: [...current.visits, saved] }, result: saved };
  });
}

/** Removes all app-logged visits (and their outcomes) for a farmer; returns the removed visit ids. */
export async function removeRuntimeVisitsForFarmer(farmerId: string): Promise<string[]> {
  return updateRuntime((current) => {
    const removed = current.visits.filter((v) => v.farmerId === farmerId).map((v) => v.id);
    const removedSet = new Set(removed);
    return {
      next: {
        visits: current.visits.filter((v) => !removedSet.has(v.id)),
        outcomes: current.outcomes.filter((o) => !removedSet.has(o.visitId)),
      },
      result: removed,
    };
  });
}

/** Saves (or replaces) the outcome for a visit. */
export async function upsertOutcome(outcome: Outcome): Promise<Outcome> {
  return updateRuntime((current) => ({
    next: {
      ...current,
      outcomes: [...current.outcomes.filter((o) => o.visitId !== outcome.visitId), outcome],
    },
    result: outcome,
  }));
}
