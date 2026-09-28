import farmersJson from "../../data/farmers.json";
import productsJson from "../../data/products.json";
import villagesJson from "../../data/villages.json";
import visitsSeedJson from "../../data/visits.seed.json";
import type { Farmer, Outcome, Product, Village, Visit } from "@/types/domain";
import {
  farmersFileSchema,
  productsFileSchema,
  villagesFileSchema,
  visitsSeedFileSchema,
} from "./dataSchemas";

// Static reference data from /data, validated once at module load.

export const villages: readonly Village[] = villagesFileSchema.parse(villagesJson);
export const farmers: readonly Farmer[] = farmersFileSchema.parse(farmersJson);
export const products: readonly Product[] = productsFileSchema.parse(productsJson);

const seed = visitsSeedFileSchema.parse(visitsSeedJson);
export const seedVisits: readonly Visit[] = seed.visits;
export const seedOutcomes: readonly Outcome[] = seed.outcomes;

export function findFarmer(id: string): Farmer | undefined {
  return farmers.find((f) => f.id === id);
}

export function findVillage(id: string): Village | undefined {
  return villages.find((v) => v.id === id);
}

export function findVillageBySlug(slug: string): Village | undefined {
  return villages.find((v) => v.slug === slug);
}

export function findProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function findSeedVisit(id: string): Visit | undefined {
  return seedVisits.find((v) => v.id === id);
}
