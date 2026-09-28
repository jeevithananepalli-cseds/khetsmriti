/**
 * Retains all seed visits and outcomes in chronological order with their real dates.
 * Idempotent: document_id (visit:<id> / outcome:<id>) makes Hindsight replace, not duplicate.
 * Usage: npm run seed:memory [-- --farmer F001]
 */
import { retainItems } from "../src/lib/memory";
import { buildSeedItems } from "../src/lib/seedItems";

const BATCH_SIZE = 6;

async function main(): Promise<void> {
  const flagIndex = process.argv.indexOf("--farmer");
  const farmerFilter = flagIndex > -1 ? process.argv[flagIndex + 1] : undefined;
  const items = buildSeedItems(farmerFilter);
  console.log(`Seeding ${items.length} memories${farmerFilter ? ` for ${farmerFilter}` : ""} in batches of ${BATCH_SIZE}…`);

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const started = Date.now();
    await retainItems(
      batch.map((b) => b.item),
      `seed batch ${i / BATCH_SIZE + 1}`,
    );
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
