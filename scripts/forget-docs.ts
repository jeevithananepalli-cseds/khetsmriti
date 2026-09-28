/** Deletes memory documents by id, e.g. after a test. Usage: npm run forget:docs -- visit:V037 outcome:V037 */
import { forgetDocuments } from "../src/lib/memory";

async function main(): Promise<void> {
  const ids = process.argv.slice(2).filter((a) => /^(visit|outcome):V\d{3,}$/.test(a));
  if (ids.length === 0) throw new Error("Pass document ids like visit:V037 outcome:V037");
  const deleted = await forgetDocuments(ids, `forget ${ids.join(", ")}`);
  console.log(`Deleted ${deleted} of ${ids.length} documents.`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
