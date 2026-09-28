import "server-only";
import type { MemoryEvent } from "@/types/domain";
import { forgetDocuments, retainItems } from "./memory";
import { outcomeDocumentId, visitDocumentId } from "./narrative";
import { todayInIndia } from "./season";
import { buildSeedItems, buildSeedSteps, seedDocumentIds } from "./seedItems";
import { removeRuntimeVisitsForFarmer } from "./visitStore";

// Demo controls for the judges' page. Only ever touches the demo farmer's documents.

export const DEMO_FARMER_ID = "F001";

export interface ReplayStepInfo {
  index: number;
  visitId: string;
  date: string;
  label: string;
  /** Date of the visit the brief is prepared for after this step (the next visit, or today). */
  nextVisitDate: string;
}

export function replaySteps(): ReplayStepInfo[] {
  const steps = buildSeedSteps(DEMO_FARMER_ID);
  return steps.map((s, index) => ({
    index,
    visitId: s.visitId,
    date: s.date,
    label: s.label,
    nextVisitDate: steps[index + 1]?.date ?? todayInIndia(),
  }));
}

async function forgetAppLoggedVisits(): Promise<void> {
  const removed = await removeRuntimeVisitsForFarmer(DEMO_FARMER_ID);
  const docs = removed.flatMap((id) => [visitDocumentId(id), outcomeDocumentId(id)]);
  await forgetDocuments(docs, `forget ${removed.length} app-logged ${DEMO_FARMER_ID} visits`);
}

/** Restores the demo farmer's full seeded history (and drops visits logged during the demo). */
export async function resetDemo(): Promise<MemoryEvent> {
  await forgetAppLoggedVisits();
  return retainItems(
    buildSeedItems(DEMO_FARMER_ID).map((i) => i.item),
    `reset demo: re-seed ${DEMO_FARMER_ID} history`,
  );
}

/** Clears the demo farmer's memory so the replay can rebuild it visit by visit. */
export async function startReplay(): Promise<ReplayStepInfo[]> {
  await forgetAppLoggedVisits();
  await forgetDocuments(seedDocumentIds(DEMO_FARMER_ID), `replay: clear ${DEMO_FARMER_ID} memory`);
  return replaySteps();
}

/** Retains one replay step (a visit and its outcome). */
export async function replayStep(index: number): Promise<{ step: ReplayStepInfo; event: MemoryEvent } | null> {
  const steps = buildSeedSteps(DEMO_FARMER_ID);
  const info = replaySteps()[index];
  const step = steps[index];
  if (!step || !info) return null;
  const event = await retainItems(
    step.items.map((i) => i.item),
    `replay step ${index + 1}/${steps.length}: ${step.visitId} ${step.date}`,
  );
  return { step: info, event };
}
