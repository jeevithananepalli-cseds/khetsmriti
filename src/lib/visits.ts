import "server-only";
import type { MemoryEvent, Outcome, Visit, VisitStructured } from "@/types/domain";
import { findFarmer, findVillage, products } from "./data";
import { filterKnownProductIds } from "./guardrails";
import type { LlmError } from "./llm";
import { MemoryError, retainOutcome, retainVisit } from "./memory";
import { todayInIndia } from "./season";
import { structureVisit } from "./visitStructuring";
import { addVisit, findVisit, upsertOutcome } from "./visitStore";

// Post-visit flow: structure the officer's note, save it, and retain it in memory.

export type VisitErrorCode = "not_found" | "bad_request" | "memory_unavailable" | LlmError["code"];
type Failure = { ok: false; error: { code: VisitErrorCode; message: string } };

export interface LogVisitInput {
  farmerId: string;
  note: string;
  officerId: string;
  visitDate?: string;
  /** Already-confirmed structure from the UI; when absent the note is structured by the LLM. */
  structured?: VisitStructured;
}

export interface LogVisitResult {
  visit: Visit;
  memoryEvent: MemoryEvent;
  warnings: string[];
}

const failure = (code: VisitErrorCode, message: string): Failure => ({ ok: false, error: { code, message } });

export async function logVisit(input: LogVisitInput): Promise<{ ok: true; data: LogVisitResult } | Failure> {
  const farmer = findFarmer(input.farmerId);
  const village = farmer && findVillage(farmer.villageId);
  if (!farmer || !village) return failure("not_found", `Farmer ${input.farmerId} not found.`);

  const visitDate = input.visitDate ?? todayInIndia();
  let structured: VisitStructured;
  let warnings: string[] = [];

  if (input.structured) {
    if (!farmer.crops.includes(input.structured.crop)) {
      return failure("bad_request", `${farmer.name} does not grow ${input.structured.crop}.`);
    }
    const ids = filterKnownProductIds(input.structured.advice.productIds, products);
    if (ids.unknown.length > 0) return failure("bad_request", `Unknown product ids: ${ids.unknown.join(", ")}.`);
    structured = input.structured;
  } else {
    const draft = await structureVisit(farmer, village, visitDate, input.note);
    if (!draft.ok) return { ok: false, error: draft.error };
    structured = draft.data.structured;
    warnings = draft.data.warnings;
  }

  const visit = await addVisit({ ...structured, farmerId: farmer.id, officerId: input.officerId, date: visitDate });
  try {
    const memoryEvent = await retainVisit(visit, farmer, village, products);
    return { ok: true, data: { visit, memoryEvent, warnings } };
  } catch (err: unknown) {
    const detail = err instanceof MemoryError ? err.message : "memory service unreachable";
    return failure("memory_unavailable", `Visit ${visit.id} was saved, but storing it in memory failed: ${detail}`);
  }
}

export interface RecordOutcomeInput {
  visitId: string;
  applied: boolean;
  result: Outcome["result"];
  yieldNote: string;
  followUpDate?: string;
}

export async function recordOutcome(
  input: RecordOutcomeInput,
): Promise<{ ok: true; data: { outcome: Outcome; memoryEvent: MemoryEvent } } | Failure> {
  const visit = await findVisit(input.visitId);
  if (!visit) return failure("not_found", `Visit ${input.visitId} not found.`);
  const farmer = findFarmer(visit.farmerId);
  const village = farmer && findVillage(farmer.villageId);
  if (!farmer || !village) return failure("not_found", `Farmer ${visit.farmerId} not found.`);

  if (input.applied === (input.result === "not_applied")) {
    return failure("bad_request", 'Use result "not_applied" exactly when applied is false.');
  }
  const followUpDate = input.followUpDate ?? todayInIndia();
  if (followUpDate < visit.date) return failure("bad_request", "Follow-up date cannot be before the visit date.");

  const outcome: Outcome = {
    visitId: visit.id,
    applied: input.applied,
    result: input.result,
    yieldNote: input.yieldNote,
    followUpDate,
  };
  try {
    const memoryEvent = await retainOutcome(outcome, visit, farmer, village, products);
    await upsertOutcome(outcome);
    return { ok: true, data: { outcome, memoryEvent } };
  } catch (err: unknown) {
    if (err instanceof MemoryError) return failure("memory_unavailable", err.message);
    throw err;
  }
}
