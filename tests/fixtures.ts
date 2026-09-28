import type { Brief, Farmer, Outcome, Product, Village, Visit } from "@/types/domain";

export const village: Village = {
  id: "VL01",
  slug: "chevella",
  name: "Chevella",
  mandal: "Chevella",
  district: "Ranga Reddy",
  dominantCrops: ["chilli", "cotton"],
  soilType: "Red sandy loam",
};

export const farmer: Farmer = {
  id: "F001",
  name: "Ramesh Goud",
  phone: "98xxxxx123",
  villageId: "VL01",
  landAcres: 4,
  crops: ["chilli", "cotton"],
  irrigation: "borewell",
  preferredLanguage: "te",
  priceSensitivity: "high",
};

export const catalogue: Product[] = [
  {
    id: "P006",
    name: "Amistar Top",
    type: "fungicide",
    targetIssues: ["leaf blight"],
    crops: ["chilli"],
    dosePerAcre: "200 ml in 200 L water",
    packSize: "500 ml",
    priceINR: 1480,
    tier: "premium",
  },
  {
    id: "P007",
    name: "Blitox 50 WP",
    type: "fungicide",
    targetIssues: ["leaf blight"],
    crops: ["chilli", "cotton"],
    dosePerAcre: "500 g in 200 L water",
    packSize: "500 g",
    priceINR: 420,
    tier: "standard",
  },
];

export const visit: Visit = {
  id: "V002",
  farmerId: "F001",
  officerId: "O01",
  date: "2026-04-08",
  crop: "chilli",
  cropStage: "fruiting",
  issue: { type: "disease", name: "leaf blight" },
  advice: { productIds: ["P006"], note: "Spray twice, 12 days apart." },
  objection: "price too high",
  farmerReaction: "rejected",
};

export const outcome: Outcome = {
  visitId: "V002",
  followUpDate: "2026-04-18",
  applied: false,
  result: "not_applied",
  yieldNote: "Blight spread; about 20% yield loss expected.",
};

export function makeBrief(overrides: Partial<Brief> = {}): Brief {
  return {
    headline: "Switch to Blitox",
    lastVisitSummary: "2026-04-08: premium rejected on price.",
    whatToCheck: ["Leaf spots"],
    recommendedProducts: [{ productId: "P007", why: "Worked nearby", evidence: "Controlled on 2026-04-13" }],
    howToPitch: "Show the neighbour's result.",
    openQuestions: ["Did you spray?"],
    claims: [{ text: "Rejected Amistar on price", sourceVisitDate: "2026-04-08" }],
    confidence: "high",
    ...overrides,
  };
}
