import "server-only";
import type { FarmerDetail, FarmerSummary, Visit } from "@/types/domain";
import { farmers, findFarmer, findVillage } from "./data";
import { allOutcomes, allVisits } from "./visitStore";

function summarise(farmerId: string, visits: readonly Visit[]): FarmerSummary | undefined {
  const farmer = findFarmer(farmerId);
  const village = farmer && findVillage(farmer.villageId);
  if (!farmer || !village) return undefined;
  const own = visits.filter((v) => v.farmerId === farmerId);
  return { farmer, village, visitCount: own.length, lastVisitDate: own.at(-1)?.date ?? null };
}

export async function listFarmerSummaries(): Promise<FarmerSummary[]> {
  const visits = await allVisits();
  return farmers
    .map((f) => summarise(f.id, visits))
    .filter((s): s is FarmerSummary => s !== undefined);
}

export async function getFarmerDetail(farmerId: string): Promise<FarmerDetail | undefined> {
  const visits = await allVisits();
  const summary = summarise(farmerId, visits);
  if (!summary) return undefined;
  const own = visits.filter((v) => v.farmerId === farmerId);
  const ids = new Set(own.map((v) => v.id));
  const outcomes = (await allOutcomes()).filter((o) => ids.has(o.visitId));
  return { ...summary, visits: own, outcomes };
}
