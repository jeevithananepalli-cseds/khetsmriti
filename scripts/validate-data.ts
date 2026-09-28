/**
 * Validates the JSON files in /data: schema, unique ids, cross-references and the seeded demo patterns.
 * Usage: npm run validate:data   (exits 1 on any error)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import {
  farmersFileSchema,
  productsFileSchema,
  villagesFileSchema,
  visitsSeedFileSchema,
} from "../src/lib/dataSchemas";
import type { Farmer, Outcome, Product, Village, Visit } from "../src/types/domain";

const DATA_DIR = join(process.cwd(), "data");
const OFFICER_IDS = new Set(["O01", "O02"]);
const SEED_START = "2026-04-01";
const SEED_END = "2026-09-30";

interface Dataset {
  villages: Village[];
  farmers: Farmer[];
  products: Product[];
  visits: Visit[];
  outcomes: Outcome[];
}

const errors: string[] = [];
const warnings: string[] = [];

function loadFile<T>(file: string, schema: z.ZodType<T>): T {
  const raw: unknown = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${file} ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Schema errors:\n${issues.join("\n")}`);
  }
  return parsed.data;
}

function checkUniqueIds(label: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${label}: duplicate id ${id}`);
    seen.add(id);
  }
}

function checkReferences(d: Dataset): void {
  const villageIds = new Set(d.villages.map((v) => v.id));
  const productById = new Map(d.products.map((p) => [p.id, p]));
  const farmerById = new Map(d.farmers.map((f) => [f.id, f]));
  const visitById = new Map(d.visits.map((v) => [v.id, v]));

  for (const f of d.farmers) {
    if (!villageIds.has(f.villageId)) errors.push(`${f.id}: unknown villageId ${f.villageId}`);
  }

  for (const v of d.visits) {
    const farmer = farmerById.get(v.farmerId);
    if (!farmer) errors.push(`${v.id}: unknown farmerId ${v.farmerId}`);
    else if (!farmer.crops.includes(v.crop)) errors.push(`${v.id}: ${farmer.id} does not grow ${v.crop}`);
    if (!OFFICER_IDS.has(v.officerId)) errors.push(`${v.id}: unknown officerId ${v.officerId}`);
    if (v.date < SEED_START || v.date > SEED_END) errors.push(`${v.id}: date ${v.date} outside Apr–Sep 2026`);

    for (const pid of v.advice.productIds) {
      const product = productById.get(pid);
      if (!product) {
        errors.push(`${v.id}: unknown productId ${pid}`);
        continue;
      }
      if (!product.crops.includes(v.crop)) errors.push(`${v.id}: ${pid} is not labelled for ${v.crop}`);
      if (!product.targetIssues.includes(v.issue.name)) {
        warnings.push(`${v.id}: ${pid} does not list issue "${v.issue.name}"`);
      }
    }
  }

  const outcomeVisitIds = new Set<string>();
  for (const o of d.outcomes) {
    const visit = visitById.get(o.visitId);
    if (!visit) {
      errors.push(`outcome: unknown visitId ${o.visitId}`);
      continue;
    }
    if (outcomeVisitIds.has(o.visitId)) errors.push(`outcome: more than one outcome for ${o.visitId}`);
    outcomeVisitIds.add(o.visitId);
    if (o.followUpDate <= visit.date) errors.push(`outcome ${o.visitId}: follow-up not after visit date`);
    if (o.followUpDate > SEED_END) errors.push(`outcome ${o.visitId}: follow-up after Sep 2026`);
    if (o.applied !== (o.result !== "not_applied")) {
      errors.push(`outcome ${o.visitId}: applied=${o.applied} contradicts result=${o.result}`);
    }
  }
}

function checkChronology(visits: Visit[]): void {
  for (let i = 1; i < visits.length; i++) {
    if (visits[i].date < visits[i - 1].date) {
      errors.push(`${visits[i].id}: visits must be in chronological order`);
    }
  }
}

function checkDemoFarmers(d: Dataset): void {
  const f001 = d.farmers.find((f) => f.id === "F001");
  const chevella = d.villages.find((v) => v.slug === "chevella");
  const f001Ok =
    f001?.name === "Ramesh Goud" &&
    f001.villageId === chevella?.id &&
    f001.landAcres === 4 &&
    f001.priceSensitivity === "high" &&
    f001.crops.includes("chilli") &&
    f001.crops.includes("cotton");
  if (!f001Ok) errors.push("F001 must be Ramesh Goud, Chevella, chilli + cotton, 4 acres, high price sensitivity");

  const f002Visits = d.visits.filter((v) => v.farmerId === "F002").length;
  if (f002Visits !== 1) errors.push(`F002 must have exactly 1 visit (has ${f002Visits})`);

  for (const f of d.farmers.filter((x) => x.id !== "F002")) {
    const n = d.visits.filter((v) => v.farmerId === f.id).length;
    if (n < 4 || n > 5) errors.push(`${f.id} should have 4–5 visits (has ${n})`);
  }
}

function describePatterns(d: Dataset): string[] {
  const productById = new Map(d.products.map((p) => [p.id, p]));
  const outcomeByVisit = new Map(d.outcomes.map((o) => [o.visitId, o]));
  const villageOf = (farmerId: string): string =>
    d.villages.find((v) => v.id === d.farmers.find((f) => f.id === farmerId)?.villageId)?.slug ?? "?";

  const blight = d.visits.filter(
    (v) => villageOf(v.farmerId) === "chevella" && v.crop === "chilli" && v.issue.name === "leaf blight",
  );
  const byTier = (tier: string): Visit[] =>
    blight.filter((v) => v.advice.productIds.some((id) => productById.get(id)?.tier === tier));
  const premium = byTier("premium");
  const premiumBad = premium.filter(
    (v) => v.farmerReaction === "rejected" || outcomeByVisit.get(v.id)?.result === "failed",
  );
  const standardOutcomes = byTier("standard")
    .map((v) => outcomeByVisit.get(v.id))
    .filter((o): o is Outcome => o !== undefined);
  const standardControlled = standardOutcomes.filter((o) => o.result === "controlled").length;

  const chevellaVisits = d.visits.filter((v) => villageOf(v.farmerId) === "chevella" && v.advice.productIds.length);
  const framed = chevellaVisits.filter((v) => /yield data|yield gap|per acre/i.test(v.advice.note));
  const plain = chevellaVisits.filter((v) => !framed.includes(v));
  const acceptRate = (vs: Visit[]): string =>
    `${vs.filter((v) => v.farmerReaction === "accepted").length}/${vs.length} accepted`;

  const pbwMonths = d.visits
    .filter((v) => villageOf(v.farmerId) === "moinabad" && v.issue.name === "pink bollworm")
    .map((v) => v.date.slice(0, 7));

  const ramesh = d.visits
    .filter((v) => v.farmerId === "F001")
    .map((v) => `${v.date} ${v.issue.name} → ${v.farmerReaction}/${outcomeByVisit.get(v.id)?.result ?? "pending"}`);

  return [
    `a) Chevella chilli leaf blight: premium failed/rejected ${premiumBad.length} of ${premium.length}; ` +
      `standard copper controlled ${standardControlled} of ${standardOutcomes.length}`,
    `b) Chevella pitch framing: with yield/cost data ${acceptRate(framed)}; plain pitch ${acceptRate(plain)}`,
    `c) Moinabad pink bollworm visits by month: ${pbwMonths.join(", ")}`,
    `d) F001 Ramesh: ${ramesh.join(" | ")}`,
  ];
}

function main(): void {
  const { visits, outcomes } = loadFile("visits.seed.json", visitsSeedFileSchema);
  const d: Dataset = {
    villages: loadFile("villages.json", villagesFileSchema),
    farmers: loadFile("farmers.json", farmersFileSchema),
    products: loadFile("products.json", productsFileSchema),
    visits,
    outcomes,
  };

  checkUniqueIds("villages", d.villages.map((v) => v.id));
  checkUniqueIds("village slugs", d.villages.map((v) => v.slug));
  checkUniqueIds("farmers", d.farmers.map((f) => f.id));
  checkUniqueIds("products", d.products.map((p) => p.id));
  checkUniqueIds("visits", d.visits.map((v) => v.id));
  checkReferences(d);
  checkChronology(d.visits);
  checkDemoFarmers(d);

  console.log(
    `villages ${d.villages.length} · products ${d.products.length} · farmers ${d.farmers.length} · ` +
      `visits ${d.visits.length} · outcomes ${d.outcomes.length}`,
  );
  describePatterns(d).forEach((line) => console.log(line));
  warnings.forEach((w) => console.warn(`WARN ${w}`));

  if (errors.length > 0) {
    errors.forEach((e) => console.error(`ERROR ${e}`));
    process.exit(1);
  }
  console.log("OK");
}

try {
  main();
} catch (err: unknown) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
