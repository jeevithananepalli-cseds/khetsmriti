/**
 * Retains all seed visits and outcomes in chronological order with their real dates.
 * Idempotent: document_id (visit:<id> / outcome:<id>) makes Hindsight replace, not duplicate.
 * Usage: npm run seed:memory [-- --farmer F001]
 */
import type { MemoryItemInput } from "@vectorize-io/hindsight-client";
import { findFarmer, findVillage, products, seedOutcomes, seedVisits } from "../src/lib/data";
import { outcomeMemoryItem, retainItems, visitMemoryItem } from "../src/lib/memory";

const BATCH_SIZE = 6;

interface SeedItem {
  date: string;
  label: string;
  item: MemoryItemInput;
}

function buildItems(farmerFilter: string | undefined): SeedItem[] {
  const items: SeedItem[] = [];
  for (const visit of seedVisits) {
    if (farmerFilter && visit.farmerId !== farmerFilter) continue;
    const farmer = findFarmer(visit.farmerId);
    const village = farmer && findVillage(farmer.villageId);
    if (!farmer || !village) throw new Error(`Seed data broken for ${visit.id}; run npm run validate:data`);

    items.push({
      date: visit.date,
      label: `visit   ${visit.id} ${visit.date} ${farmer.name} · ${visit.crop} ${visit.issue.name}`,
      item: visitMemoryItem(visit, farmer, village, products),
    });
    const outcome = seedOutcomes.find((o) => o.visitId === visit.id);
    if (outcome) {
      items.push({
        date: outcome.followUpDate,
        label: `outcome ${visit.id} ${outcome.followUpDate} ${farmer.name} · ${outcome.result}`,
        item: outcomeMemoryItem(outcome, visit, farmer, village, products),
      });
    }
  }
  // Stable sort keeps a visit before its outcome when dates tie.
  return items.toSorted((a, b) => a.date.localeCompare(b.date));
}

async function main(): Promise<void> {
  const flagIndex = process.argv.indexOf("--farmer");
  const farmerFilter = flagIndex > -1 ? process.argv[flagIndex + 1] : undefined;
  const items = buildItems(farmerFilter);
  console.log(`Seeding ${items.length} memories${farmerFilter ? ` for ${farmerFilter}` : ""} in batches of ${BATCH_SIZE}…`);

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const started = Date.now();
    await retainItems(batch.map((b) => b.item), `seed batch ${i / BATCH_SIZE + 1}`);
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    batch.forEach((b, j) => console.log(`[${i + j + 1}/${items.length}] ${b.label}`));
    console.log(`  batch retained in ${secs}s`);
  }
  console.log("Seed complete.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
