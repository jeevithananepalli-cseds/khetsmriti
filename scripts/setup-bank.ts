/** Creates/updates the Hindsight bank with the KhetSmriti mission and directives. Usage: npm run setup:bank */
import { BANK_DIRECTIVES, ensureBank } from "../src/lib/memory";

async function main(): Promise<void> {
  const { bankId } = await ensureBank();
  console.log(`Bank "${bankId}" is ready with ${BANK_DIRECTIVES.length} directives:`);
  BANK_DIRECTIVES.forEach((d) => console.log(`  - ${d.content}`));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
