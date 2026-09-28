# KhetSmriti — Claude Code Build Prompts

How to use this file:
1. Create an empty folder `khetsmriti`, put `CLAUDE.md` (from this kit) in its root, run `git init`.
2. Open Claude Code in that folder.
3. Paste the prompts below **one phase at a time, in order**. Don't start the next phase until the
   "Check" for the current one passes.
4. If something breaks, paste the **Fix prompt** at the bottom with the error.

Tip: start each phase by typing `/clear` so Claude Code works from CLAUDE.md with a fresh context.

---

## Phase 0 — Accounts (you do this, ~20 min)

- [ ] Hindsight Cloud: sign up at https://ui.hindsight.vectorize.io → Billing → apply `MEMHACK99`
      → create an API key → note the base URL.
- [ ] Groq: sign up at https://groq.com → create API key.
- [ ] GitHub: create a public repo `khetsmriti`.
- [ ] Join the Hindsight Community Slack (for API questions).

---

## Phase 1 — Scaffold (Jeevitha)

```
Read CLAUDE.md fully. Scaffold the project exactly as described there:
- Next.js 15 App Router + TypeScript strict + Tailwind + ESLint in the current folder.
- Install: @vectorize-io/hindsight-client, groq-sdk, zod, recharts, clsx.
- Create folders: src/lib, src/types, src/prompts, src/components, data, scripts.
- Create .env.example with the keys listed in CLAUDE.md, and add .env.local to .gitignore.
- Create src/types/domain.ts with types: Farmer, Village, Product, Visit, VisitStructured,
  Outcome, Brief, BriefClaim (text + sourceVisitDate), VillageInsight, MemoryEvent
  (op: 'retain'|'recall'|'reflect', tags, summary, latencyMs, at).
- Add a placeholder home page titled "KhetSmriti".
Then run npm run build and npm run lint and fix everything until both pass. Commit.
```

**Check:** `npm run dev` shows the home page; build and lint pass.

---

## Phase 2 — Synthetic data (Jeevana)

```
Read CLAUDE.md. Create realistic synthetic data for a Telangana agri-input distributor in /data.
It must look real — this data is what makes the demo credible.

1. data/villages.json — 3 villages in Ranga Reddy district: Chevella, Moinabad, Shabad.
   Fields: id, slug, name, mandal, district, dominantCrops, soilType.
2. data/products.json — 15 real-looking crop protection / nutrition products commonly sold in
   Telangana (generic names + plausible brand names), fields: id (P001..), name, type
   (fungicide/insecticide/herbicide/fertiliser/seed), targetIssues[], crops[], dosePerAcre
   (text), packSize, priceINR, tier ('budget'|'standard'|'premium').
3. data/farmers.json — 8 farmers (F001..F008) with realistic Telugu names, phone (masked like
   98xxxxx123), villageId, landAcres (1.5–12), crops[], irrigation ('borewell'|'canal'|'rainfed'),
   preferredLanguage ('te'|'en'), priceSensitivity ('high'|'medium'|'low').
   F001 must be "Ramesh Goud", Chevella, chilli + cotton, 4 acres, high price sensitivity.
4. data/visits.seed.json — history for Apr–Sep 2026: 4–5 visits per farmer (≈36 visits),
   plus an outcome for most visits. Each visit: id (V001..), farmerId, officerId (O01/O02),
   date, cropStage, issue {type: pest|disease|soil|price|irrigation, name}, advice
   {productIds[], note}, objection (nullable, e.g. "price too high", "prefers neighbour's
   brand"), farmerReaction ('accepted'|'hesitant'|'rejected'). Each outcome: visitId,
   followUpDate, applied (bool), result ('controlled'|'partial'|'failed'|'not_applied'),
   yieldNote.
   Seed these PATTERNS on purpose so the agent can learn them:
   a) In Chevella, chilli leaf blight: a premium fungicide failed or was rejected on price
      twice; a standard-tier copper fungicide controlled it 4 of 5 times.
   b) Chevella farmers are price sensitive: advice framed with yield data was accepted more.
   c) Moinabad cotton pink bollworm recurs every August.
   d) F001 Ramesh: V1 leaf blight → advised premium → rejected on price → crop loss ~20%;
      later visits show the standard product working.
   Keep F002 with only 1 past visit (to show a thin-history brief).
5. scripts/validate-data.ts — checks every referenced id exists; run it with tsx.
Commit.
```

**Check:** `npx tsx scripts/validate-data.ts` prints OK.

---

## Phase 3 — Memory layer (Jeevitha)

```
Read CLAUDE.md, especially "Hindsight rules". First fetch and read the Hindsight docs URLs listed
there (TypeScript SDK, retain, recall, reflect, memory banks). Confirm from the docs how to
authenticate against Hindsight Cloud and how tag filtering works in recall and reflect. Then:

1. src/lib/memory.ts (server-only) exporting:
   - ensureBank() — create/configure the bank with the mission and directives from CLAUDE.md.
   - retainVisit(visit, farmer, village, products) — builds the narrative content and retains it
     with document_id, timestamp, context, metadata, tags, observation_scopes per CLAUDE.md.
   - retainOutcome(outcome, visit, farmer, village)
   - recallFarmer(farmerId, query) and recallSimilar(villageSlug, cropSlug, query)
   - reflectVillage(villageSlug, question)
   Every function logs a MemoryEvent to src/lib/memoryLog.ts (ring buffer of last 100 events).
2. scripts/setup-bank.ts → npm run setup:bank
3. scripts/seed-memory.ts → npm run seed:memory — retains all seed visits and outcomes in
   chronological order using retainBatch where possible, with real timestamps. Idempotent
   (document_id makes re-runs safe). Prints a progress line per item.
4. scripts/smoke-memory.ts → npm run smoke:memory — recalls for F001 and reflects on Chevella,
   prints results.
Run setup, seed, smoke against the real API. Fix until smoke prints sensible memories.
Build + lint must pass. Commit.
```

**Check:** smoke output mentions Ramesh's leaf blight and the price objection. Open Hindsight
Cloud UI and confirm memories + observations exist.

---

## Phase 4 — LLM layer + pre-visit brief API (Jeevitha)

```
Read CLAUDE.md "LLM rules". Build:
1. src/lib/llm.ts — generateJSON<T>(schema, messages) using Groq with JSON output, zod validation,
   one retry with the validation error, then fallback model, then a typed error.
2. src/prompts/brief.ts — prompt that takes farmer profile, upcoming visit context (crop stage
   guess from date), recalled farmer memories, recalled similar-case memories, and the product
   catalogue; returns a Brief:
   { headline, lastVisitSummary, whatToCheck[], recommendedProducts[{productId, why,
     evidence}], howToPitch, openQuestions[], claims[{text, sourceVisitDate}], confidence }
   Rules in prompt: only catalogue products, cite visit dates, say "no history" when empty.
3. src/lib/brief.ts — buildBrief(farmerId, {memoryEnabled}) — when memoryEnabled is false, skip
   all recall and tell the prompt there is no history. Validate productIds against catalogue.
4. API: GET /api/farmers, GET /api/farmers/[id], POST /api/brief {farmerId, memoryEnabled},
   GET /api/memory/events.
Test with curl for F001 with memory on and off and paste both outputs into docs/brief-samples.md.
Build + lint. Commit.
```

**Check:** memory OFF brief is generic; memory ON brief mentions the April price objection and
recommends the standard copper fungicide with evidence.

---

## Phase 5 — Log a visit (voice + text) and outcomes (Jeevitha)

```
Build the post-visit flow:
1. POST /api/transcribe — accepts an audio file (webm/m4a/wav, ≤2 min), calls Groq Whisper, returns
   text. Handle Telugu.
2. src/prompts/structureVisit.ts + POST /api/visits — takes farmerId + free text (English, Telugu
   or mixed), uses the LLM to produce VisitStructured (cropStage, issue, advice productIds,
   objection, farmerReaction), validates, saves to data/visits.runtime.json, then retainVisit().
   Returns the structured visit and the memory event.
3. POST /api/outcomes — {visitId, applied, result, yieldNote} → retainOutcome().
Edge cases: empty audio, unknown product mentioned (flag it, don't invent), farmer not found,
Groq timeout. Build + lint. Commit.
```

---

## Phase 6 — Village insights with reflect (Jeevitha)

```
Build GET /api/insights?village=<slug>&crop=<slug> that calls reflectVillage() with 3 fixed
questions (what advice works for the top issue, how to handle objections, what to watch next
month) and returns VillageInsight[] with the reflect text and any cited sources Hindsight returns.
Cache results for 5 minutes in memory. Build + lint. Commit.
```

---

## Phase 7 — UI (Jeevana)

```
Read CLAUDE.md "UI rules". Build a clean, mobile-first UI (Tailwind). Earthy but modern palette,
no emoji icons. Screens:
1. / — Farmers list: search, filter by village, each card shows name, village, crops, last visit
   date, and a "Prepare visit" button.
2. /farmers/[id] — Pre-visit brief: header with farmer profile; big "Memory ON/OFF" toggle;
   brief sections (last visit, what to check, recommended products with evidence chips showing
   visit dates, how to pitch, open questions); "Log this visit" button.
3. /farmers/[id]/log — Log visit: record voice (MediaRecorder) or type; shows transcription, then
   the structured result for confirmation, then "Save to memory".
4. /insights — Village insights: pick village + crop, show reflect answers.
5. Memory panel: a right-side drawer (bottom sheet on mobile) on every page, polling
   /api/memory/events every 2s, showing each retain/recall/reflect with op badge, tags, summary,
   latency. This panel is the star of the demo — make it clearly visible.
Loading skeletons, empty states and error states on every screen. Build + lint. Commit.
```

---

## Phase 8 — Demo mode + learning curve (Jeevana)

```
Add a /demo page for judges:
1. Side-by-side: the same farmer (F001) brief with Memory OFF (left) and Memory ON (right).
2. "Replay history" control: steps through F001's visits one by one; after each step it retains
   that visit and regenerates the brief, so the brief visibly gets sharper visit by visit.
3. Learning-curve chart (recharts): for the seeded data, per month, % of advice accepted and
   % of advice that controlled the issue — computed from the data files, labelled clearly as
   simulated field data.
4. A "Reset demo" button that re-seeds only F001's demo documents (by document_id).
Build + lint. Commit.
```

---

## Phase 9 — Hardening (both)

```
Review the whole codebase against CLAUDE.md. Then:
- Add unit tests (vitest) for: narrative builder, product-id guardrail, zod schemas, llm retry
  logic (mock Groq).
- Check every API route for input validation and error handling.
- Make sure no server secret can reach the client bundle.
- Make sure the app still works if Hindsight is slow (show a spinner, timeout at 20s, readable
  error).
- Fix all warnings. Run build, lint, tests. Commit.
```

---

## Phase 10 — README + diagrams (Jeevana)

```
Write README.md for judges and recruiters:
- One-line pitch, the problem, a 60-second "how it works".
- Architecture diagram and the pre-visit / post-visit sequence diagrams as Mermaid.
- "How KhetSmriti uses Hindsight" section: bank mission/directives, tag scheme, retain/recall/
  reflect with short real code snippets from src/lib/memory.ts, per_tag observation scopes, and
  the Memory OFF comparison.
- Setup: env vars, npm run setup:bank, npm run seed:memory, npm run dev.
- Screenshots placeholders in docs/screenshots/.
- Links: https://github.com/vectorize-io/hindsight, https://hindsight.vectorize.io/,
  https://vectorize.io/what-is-agent-memory
Never use the word "hackathon". Commit and push.
```

---

## Phase 11 — Content (each of you)

Run the prompts from the Content Guide (title ideas → article → LinkedIn post → video script)
inside this repo in Claude Code. Remember:
- Jeevitha's article angle: "the memory design" (tags, per-farmer vs per-village observations,
  why reflect beats hand-written rules).
- Jeevana's article angle: "making a demo feel real" (synthetic data with seeded patterns, the
  Memory ON/OFF side-by-side, the live memory panel).
- No "hackathon" anywhere. Tag Code.in.

---

## Fix prompt (use whenever something breaks)

```
This is failing:
<paste the exact error / what you see / what you expected>
Use the systematic debugging approach: reproduce it, find the root cause, explain it in two
sentences, then fix it. Don't change unrelated code. Re-run build + lint (+ tests) afterwards.
```

## Review prompt (before each commit to main)

```
Review the changes since the last commit against CLAUDE.md. List any violations (Hindsight calls
outside memory.ts, missing zod validation, secrets in client code, invented products, missing
error states) and fix them.
```
