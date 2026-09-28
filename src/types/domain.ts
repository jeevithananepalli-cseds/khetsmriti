// Shared domain types for KhetSmriti. Used by server and client code alike.

export type Language = "te" | "en";
export type Irrigation = "borewell" | "canal" | "rainfed";
export type PriceSensitivity = "high" | "medium" | "low";
export type ProductType = "fungicide" | "insecticide" | "herbicide" | "fertiliser" | "seed";
export type ProductTier = "budget" | "standard" | "premium";
export type IssueType = "pest" | "disease" | "soil" | "price" | "irrigation";
export type FarmerReaction = "accepted" | "hesitant" | "rejected";
export type OutcomeResult = "controlled" | "partial" | "failed" | "not_applied";
export type Confidence = "low" | "medium" | "high";
export type MemoryOp = "retain" | "recall" | "reflect";

export interface Village {
  id: string;
  slug: string;
  name: string;
  mandal: string;
  district: string;
  dominantCrops: string[];
  soilType: string;
}

export interface Farmer {
  id: string; // F001..
  name: string;
  phone: string; // masked, e.g. 98xxxxx123
  villageId: string;
  landAcres: number;
  crops: string[];
  irrigation: Irrigation;
  preferredLanguage: Language;
  priceSensitivity: PriceSensitivity;
}

export interface Product {
  id: string; // P001..
  name: string;
  type: ProductType;
  targetIssues: string[];
  crops: string[];
  dosePerAcre: string;
  packSize: string;
  priceINR: number;
  tier: ProductTier;
}

export interface VisitIssue {
  type: IssueType;
  name: string;
}

export interface VisitAdvice {
  productIds: string[];
  note: string;
}

/** The part of a visit the LLM extracts from an officer's free-text / voice note. */
export interface VisitStructured {
  crop: string; // crop slug, e.g. "chilli"; drives the crop:<slug> memory tag
  cropStage: string;
  issue: VisitIssue;
  advice: VisitAdvice;
  objection: string | null;
  farmerReaction: FarmerReaction;
}

export interface Visit extends VisitStructured {
  id: string; // V001..
  farmerId: string;
  officerId: string; // O01..
  date: string; // ISO date
}

export interface Outcome {
  visitId: string;
  followUpDate: string; // ISO date
  applied: boolean;
  result: OutcomeResult;
  yieldNote: string;
}

/** A single factual claim in a brief, tied to the visit it came from. */
export interface BriefClaim {
  text: string;
  sourceVisitDate: string | null; // ISO date; null when there is no supporting visit
}

export interface BriefProductRecommendation {
  productId: string;
  why: string;
  evidence: string;
}

export interface Brief {
  headline: string;
  lastVisitSummary: string;
  whatToCheck: string[];
  recommendedProducts: BriefProductRecommendation[];
  howToPitch: string;
  openQuestions: string[];
  claims: BriefClaim[];
  confidence: Confidence;
}

export interface VillageInsight {
  villageSlug: string;
  cropSlug: string | null;
  question: string;
  answer: string;
  sources: string[];
}

export interface MemoryEvent {
  id: number; // monotonically increasing, for UI keys and polling
  op: MemoryOp;
  ok: boolean;
  tags: string[];
  summary: string;
  latencyMs: number;
  at: string; // ISO timestamp
}

export type MemoryFactType = "world" | "experience" | "observation";

/** One memory returned by a Hindsight recall, trimmed to what the app uses. */
export interface MemoryHit {
  id: string;
  text: string;
  type: MemoryFactType | null;
  occurredAt: string | null; // ISO; when the remembered event happened
  documentId: string | null; // e.g. visit:V002, outcome:V002
  tags: string[];
  metadata: Record<string, string>;
}

export interface ReflectSource {
  id: string | null;
  text: string;
  type: string | null;
  occurredAt: string | null;
}

export interface ReflectResult {
  text: string;
  sources: ReflectSource[];
}

export interface FarmerSummary {
  farmer: Farmer;
  village: Village;
  visitCount: number;
  lastVisitDate: string | null;
}

export interface FarmerDetail extends FarmerSummary {
  visits: Visit[];
  outcomes: Outcome[];
}

export interface BriefResponse {
  brief: Brief;
  memoryEnabled: boolean;
  visitDate: string;
  model: string;
  attempts: number;
  /** Things the guardrails removed or could not verify; shown to the officer. */
  warnings: string[];
  farmerMemories: MemoryHit[];
  similarMemories: MemoryHit[];
}

export interface ApiError {
  code: string;
  message: string;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };
