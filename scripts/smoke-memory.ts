/** Recalls for F001 and reflects on Chevella against the real bank. Usage: npm run smoke:memory */
import type { MemoryHit } from "../src/types/domain";
import { recallFarmer, recallSimilar, reflectVillage } from "../src/lib/memory";
import { getMemoryEvents } from "../src/lib/memoryLog";

function printHits(title: string, hits: MemoryHit[]): void {
  console.log(`\n=== ${title} (${hits.length}) ===`);
  hits.slice(0, 12).forEach((h) => {
    const date = h.occurredAt ? h.occurredAt.slice(0, 10) : "no date";
    console.log(`- [${h.type ?? "?"}] ${date} ${h.text}`);
  });
}

async function main(): Promise<void> {
  printHits(
    "Recall F001 (Ramesh Goud)",
    await recallFarmer("F001", "Upcoming visit to Ramesh Goud for chilli leaf blight: what was advised before, objections, and what worked?"),
  );
  printHits(
    "Similar cases: Chevella chilli",
    await recallSimilar("chevella", "chilli", "Which fungicide controlled chilli leaf blight and which was rejected on price?"),
  );

  const reflection = await reflectVillage(
    "chevella",
    "Which advice for chilli leaf blight has worked in this village, and how should officers handle price objections here?",
  );
  console.log("\n=== Reflect: Chevella ===");
  console.log(reflection.text);
  console.log(`(${reflection.sources.length} source memories)`);

  console.log("\n=== Memory event log ===");
  getMemoryEvents()
    .toReversed()
    .forEach((e) => console.log(`${e.op.padEnd(7)} ${e.ok ? "ok " : "ERR"} ${String(e.latencyMs).padStart(6)}ms  [${e.tags.join(", ")}] ${e.summary}`));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
