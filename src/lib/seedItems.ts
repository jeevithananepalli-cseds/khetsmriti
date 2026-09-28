import "server-only";
import type { MemoryItemInput } from "@vectorize-io/hindsight-client";
import { findFarmer, findVillage, products, seedOutcomes, seedVisits } from "./data";
import { outcomeMemoryItem, visitMemoryItem } from "./memory";

// Builds the Hindsight items for the seed history. Shared by `npm run seed:memory` and the /demo page.

export interface SeedItem {
  date: string;
  visitId: string;
  label: string;
  item: MemoryItemInput;
}

/** One replay step = a visit plus its follow-up outcome (if any). */
export interface SeedStep {
  visitId: string;
  date: string;
  label: string;
  items: SeedItem[];
}

export function buildSeedSteps(farmerId?: string): SeedStep[] {
  return seedVisits
    .filter((v) => !farmerId || v.farmerId === farmerId)
    .map((visit) => {
      const farmer = findFarmer(visit.farmerId);
      const village = farmer && findVillage(farmer.villageId);
      if (!farmer || !village) throw new Error(`Seed data broken for ${visit.id}; run npm run validate:data`);

      const items: SeedItem[] = [
        {
          date: visit.date,
          visitId: visit.id,
          label: `visit   ${visit.id} ${visit.date} ${farmer.name} · ${visit.crop} ${visit.issue.name}`,
          item: visitMemoryItem(visit, farmer, village, products),
        },
      ];
      const outcome = seedOutcomes.find((o) => o.visitId === visit.id);
      if (outcome) {
        items.push({
          date: outcome.followUpDate,
          visitId: visit.id,
          label: `outcome ${visit.id} ${outcome.followUpDate} ${farmer.name} · ${outcome.result}`,
          item: outcomeMemoryItem(outcome, visit, farmer, village, products),
        });
      }
      return {
        visitId: visit.id,
        date: visit.date,
        label: `${visit.crop} ${visit.issue.name} → ${visit.farmerReaction}${outcome ? `, ${outcome.result.replace("_", " ")}` : ""}`,
        items,
      };
    });
}

/** All seed items in chronological order (a visit stays before its outcome when dates tie). */
export function buildSeedItems(farmerId?: string): SeedItem[] {
  return buildSeedSteps(farmerId)
    .flatMap((s) => s.items)
    .toSorted((a, b) => a.date.localeCompare(b.date));
}

export function seedDocumentIds(farmerId: string): string[] {
  return buildSeedItems(farmerId)
    .map((i) => i.item.document_id)
    .filter((id): id is string => Boolean(id));
}
