// Rough crop-stage calendar for kharif/rabi seasons in Ranga Reddy district, Telangana.
// Used only to give the LLM a starting guess; the officer confirms the real stage in the field.

const STAGES_BY_MONTH: Record<string, readonly string[]> = {
  // index 0 = January … 11 = December
  chilli: [
    "fruiting / picking (rabi)", "picking (rabi)", "final picking (rabi)", "fruiting / picking (rabi, borewell)",
    "final picking or fallow", "nursery", "nursery / transplanting", "transplanting / vegetative",
    "vegetative / flowering", "flowering / fruit set", "fruiting", "fruiting / first picking",
  ],
  cotton: [
    "last picking", "field clearing", "fallow", "fallow", "field preparation", "sowing",
    "seedling / vegetative", "squaring / flowering", "flowering / boll formation", "boll formation / boll opening",
    "picking", "picking",
  ],
  paddy: [
    "rabi transplanting / early tillering", "rabi tillering", "rabi panicle initiation / flowering",
    "rabi grain filling / harvest", "fallow / field preparation", "nursery", "transplanting / early tillering",
    "tillering", "panicle initiation / booting", "flowering / grain filling", "harvest", "rabi nursery",
  ],
  maize: [
    "rabi vegetative", "rabi tasseling", "rabi grain filling", "rabi harvest", "fallow", "sowing",
    "early whorl / knee-high", "tasseling / silking", "grain filling", "harvest", "rabi sowing", "rabi early whorl",
  ],
};

export function guessCropStage(crop: string, isoDate: string): string {
  const month = Number(isoDate.slice(5, 7)) - 1;
  const stages = STAGES_BY_MONTH[crop];
  if (!stages || Number.isNaN(month)) return "stage unknown — confirm in the field";
  return stages[month] ?? "stage unknown — confirm in the field";
}

/** Today's date in India (YYYY-MM-DD), independent of the server's timezone. */
export function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
