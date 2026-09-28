import "server-only";
import {
  HindsightClient,
  type MemoryItemInput,
  type RecallResult,
  type ReflectResponse,
} from "@vectorize-io/hindsight-client";
import type {
  Farmer,
  MemoryEvent,
  MemoryFactType,
  MemoryHit,
  MemoryOp,
  Outcome,
  Product,
  ReflectResult,
  Village,
  Visit,
} from "@/types/domain";
import { logMemoryEvent } from "./memoryLog";
import {
  buildOutcomeNarrative,
  buildVisitNarrative,
  isoTimestamp,
  memoryMetadata,
  outcomeDocumentId,
  outcomeTags,
  tag,
  visitDocumentId,
  visitTags,
} from "./narrative";
import { serverEnv } from "./serverEnv";

// The ONLY module that talks to Hindsight. Every call is timed and pushed to the memory event log.

export const BANK_MISSION =
  "I am the field memory of an agri-input distributor. I remember every farmer visit, the advice given, " +
  "the farmer's objections and the crop outcome, so that field officers give advice that has actually " +
  "worked for this farmer and this village.";

export const BANK_DIRECTIVES: ReadonlyArray<{ name: string; content: string }> = [
  { name: "Catalogue products only", content: "Only recommend products that appear in the provided product catalogue." },
  { name: "Catalogue dosages only", content: "Never state a dosage that is not in the catalogue." },
  { name: "Cite visit dates", content: "Always cite the visit date that supports a claim." },
  { name: "Admit missing history", content: "If there is no history, say so plainly." },
];

const RECALL_TYPES: MemoryFactType[] = ["world", "experience", "observation"];

export class MemoryError extends Error {
  constructor(
    message: string,
    readonly op: MemoryOp,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "MemoryError";
  }
}

const globalForClient = globalThis as typeof globalThis & { __khetHindsight?: HindsightClient };

function client(): HindsightClient {
  if (!globalForClient.__khetHindsight) {
    const env = serverEnv();
    globalForClient.__khetHindsight = new HindsightClient({
      baseUrl: env.HINDSIGHT_BASE_URL,
      apiKey: env.HINDSIGHT_API_KEY,
      userAgent: "khetsmriti/0.1",
    });
  }
  return globalForClient.__khetHindsight;
}

const bankId = (): string => serverEnv().HINDSIGHT_BANK_ID;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function statusCode(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "statusCode" in err) {
    const code = (err as { statusCode?: unknown }).statusCode;
    return typeof code === "number" ? code : undefined;
  }
  return undefined;
}

/** Runs a Hindsight call, records a MemoryEvent (success or failure) and normalises errors. */
async function tracked<T>(
  op: MemoryOp,
  tags: string[],
  summary: string,
  fn: () => Promise<T>,
): Promise<{ value: T; event: MemoryEvent }> {
  const started = performance.now();
  const finish = (ok: boolean, detail = ""): MemoryEvent =>
    logMemoryEvent({
      op,
      ok,
      tags,
      summary: detail ? `${summary} — ${detail}` : summary,
      latencyMs: Math.round(performance.now() - started),
      at: new Date().toISOString(),
    });
  try {
    const value = await fn();
    return { value, event: finish(true) };
  } catch (err: unknown) {
    finish(false, `failed: ${errorMessage(err)}`);
    throw new MemoryError(`Hindsight ${op} failed: ${errorMessage(err)}`, op, statusCode(err));
  }
}

// ---------- bank ----------

/** Creates or updates the bank and syncs the directives. Safe to run repeatedly. */
export async function ensureBank(): Promise<{ bankId: string; directives: number }> {
  const id = bankId();
  const { value } = await tracked("retain", [], `ensure bank ${id}`, async () => {
    await client().createBank(id, {
      name: "KhetSmriti field memory",
      reflectMission: BANK_MISSION,
      retainMission:
        "Extract who was visited, where, which crop and stage, the issue, which products were advised, " +
        "the farmer's objection and reaction, and whether the advice worked. Keep dates, prices and product ids.",
      observationsMission:
        "Consolidate what advice works or fails for each farmer, village and crop, how farmers respond to " +
        "price, and which pests or diseases recur in which months.",
    });

    const existing = await client().listDirectives(id, { limit: 100 });
    for (const d of BANK_DIRECTIVES) {
      const match = existing.items.find((x) => x.name === d.name);
      if (!match) {
        await client().createDirective(id, d.name, d.content);
      } else if (match.content !== d.content || match.is_active === false) {
        await client().updateDirective(id, match.id, { content: d.content, isActive: true });
      }
    }
    return { bankId: id, directives: BANK_DIRECTIVES.length };
  });
  return value;
}

// ---------- retain ----------

export function visitMemoryItem(
  visit: Visit,
  farmer: Farmer,
  village: Village,
  catalogue: readonly Product[],
): MemoryItemInput {
  return {
    content: buildVisitNarrative(visit, farmer, village, catalogue),
    document_id: visitDocumentId(visit.id),
    timestamp: isoTimestamp(visit.date),
    context: "field visit",
    metadata: memoryMetadata(visit, village),
    tags: visitTags(visit, village),
    observation_scopes: "per_tag",
  };
}

export function outcomeMemoryItem(
  outcome: Outcome,
  visit: Visit,
  farmer: Farmer,
  village: Village,
  catalogue: readonly Product[],
): MemoryItemInput {
  return {
    content: buildOutcomeNarrative(outcome, visit, farmer, village, catalogue),
    document_id: outcomeDocumentId(visit.id),
    timestamp: isoTimestamp(outcome.followUpDate),
    context: "crop outcome follow-up",
    metadata: { ...memoryMetadata(visit, village), result: outcome.result },
    tags: outcomeTags(visit, village),
    observation_scopes: "per_tag",
  };
}

function uniqueTags(items: readonly MemoryItemInput[]): string[] {
  return [...new Set(items.flatMap((i) => i.tags ?? []))];
}

/** Retains several items in one request (used by seeding and demo replay). Returns the logged event. */
export async function retainItems(items: readonly MemoryItemInput[], summary: string): Promise<MemoryEvent> {
  const { event } = await tracked("retain", uniqueTags(items), summary, () =>
    client().retainBatch(bankId(), [...items]),
  );
  return event;
}

export async function retainVisit(
  visit: Visit,
  farmer: Farmer,
  village: Village,
  catalogue: readonly Product[],
): Promise<MemoryEvent> {
  return retainItems(
    [visitMemoryItem(visit, farmer, village, catalogue)],
    `visit ${visit.id} · ${farmer.name} · ${visit.crop} ${visit.issue.name}`,
  );
}

export async function retainOutcome(
  outcome: Outcome,
  visit: Visit,
  farmer: Farmer,
  village: Village,
  catalogue: readonly Product[],
): Promise<MemoryEvent> {
  return retainItems(
    [outcomeMemoryItem(outcome, visit, farmer, village, catalogue)],
    `outcome ${visit.id} · ${farmer.name} · ${outcome.result}`,
  );
}

/** Deletes documents (and their memories) by document_id. Missing documents are ignored. */
export async function forgetDocuments(documentIds: readonly string[], summary: string): Promise<number> {
  if (documentIds.length === 0) return 0;
  const { value } = await tracked("retain", [], summary, async () => {
    let deleted = 0;
    for (const id of documentIds) {
      try {
        await client().deleteDocument(bankId(), id);
        deleted += 1;
      } catch (err: unknown) {
        if (statusCode(err) !== 404) throw err;
      }
    }
    return deleted;
  });
  return value;
}

// ---------- recall ----------

function toMemoryHit(r: RecallResult): MemoryHit {
  const type = r.type === "world" || r.type === "experience" || r.type === "observation" ? r.type : null;
  return {
    id: r.id,
    text: r.text,
    type,
    occurredAt: r.occurred_start ?? r.mentioned_at ?? null,
    documentId: r.document_id ?? null,
    tags: r.tags ?? [],
    metadata: r.metadata ?? {},
  };
}

async function recallTagged(tags: string[], tagsMatch: "any_strict" | "all_strict", query: string, label: string) {
  const { value } = await tracked("recall", tags, label, () =>
    client().recall(bankId(), query, { types: RECALL_TYPES, budget: "mid", tags, tagsMatch }),
  );
  return value.results.map(toMemoryHit);
}

/** Everything remembered about one farmer (their visits, outcomes and per-farmer observations). */
export async function recallFarmer(farmerId: string, query: string): Promise<MemoryHit[]> {
  return recallTagged([tag.farmer(farmerId)], "any_strict", query, `recall farmer ${farmerId}`);
}

/** Similar cases from other farmers: memories tagged with BOTH this village and this crop. */
export async function recallSimilar(villageSlug: string, cropSlug: string, query: string): Promise<MemoryHit[]> {
  return recallTagged(
    [tag.village(villageSlug), tag.crop(cropSlug)],
    "all_strict",
    query,
    `recall similar ${villageSlug}/${cropSlug}`,
  );
}

// ---------- reflect ----------

function toReflectResult(res: ReflectResponse): ReflectResult {
  return {
    text: res.text,
    sources: (res.based_on?.memories ?? []).map((m) => ({
      id: m.id ?? null,
      text: m.text,
      type: m.type ?? null,
      occurredAt: m.occurred_start ?? null,
    })),
  };
}

/**
 * Asks Hindsight to reason over everything tagged with this village. The crop narrows the question text;
 * the tag filter stays on the village so per-village observations are included.
 */
export async function reflectVillage(villageSlug: string, question: string, cropSlug?: string): Promise<ReflectResult> {
  const tags = [tag.village(villageSlug)];
  const eventTags = cropSlug ? [...tags, tag.crop(cropSlug)] : tags;
  const { value } = await tracked("reflect", eventTags, `reflect ${villageSlug}: ${question.slice(0, 60)}`, () =>
    client().reflect(bankId(), question, { budget: "mid", tags, tagsMatch: "any_strict", includeFacts: true }),
  );
  return toReflectResult(value);
}
