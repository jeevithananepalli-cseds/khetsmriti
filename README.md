# KhetSmriti

> A field officer who never forgets a farmer — it remembers every visit, objection and crop outcome,
> and learns which advice works in each village.

KhetSmriti ("field memory") is an AI agent for field officers of agri-input distributors. Before a
farmer visit it produces a pre-visit brief from everything it remembers about that farmer; after the
visit it structures the officer's note and retains it, learning over time which advice actually works.

Built with [Hindsight](https://hindsight.vectorize.io/) by Vectorize.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Hindsight and Groq keys
npm run dev
```

Open http://localhost:3000.

## Demo data

`/data` holds simulated field data for an agri-input distributor in Ranga Reddy district, Telangana:
3 villages (Chevella, Moinabad, Shabad), a 15-product catalogue, 8 farmers and 36 visits with 30
crop outcomes from April–September 2026. The history contains patterns for the agent to learn, for
example: in Chevella a standard copper fungicide controls chilli leaf blight where a premium one is
rejected on price, and in Moinabad pink bollworm returns every August.

```bash
npm run validate:data   # schema, id references and seeded patterns; prints OK
```

## Memory layer (Hindsight)

All Hindsight calls live in [`src/lib/memory.ts`](src/lib/memory.ts). Each call is timed and written
to an in-memory event log (`src/lib/memoryLog.ts`) that the UI shows live.

- **Bank:** `ensureBank()` sets the mission and syncs four directives: catalogue products only,
  catalogue dosages only, cite visit dates, and say so when there is no history.
- **Retain:** one document per visit (`visit:<id>`) and per outcome (`outcome:<id>`). Each is stored
  with the real visit date as its timestamp, tagged `farmer:` `village:` `crop:` `officer:` `kind:`,
  and uses `observation_scopes: "per_tag"`.
- **Recall:** `recallFarmer` (tag `farmer:<id>`) and `recallSimilar` (tags `village:<slug>` +
  `crop:<slug>`, all required).
- **Reflect:** `reflectVillage` reasons over everything tagged with the village.

```bash
npm run setup:bank     # create/update the bank + directives (idempotent)
npm run seed:memory    # retain all 36 visits + 30 outcomes in date order (idempotent)
npm run smoke:memory   # recall F001, similar Chevella chilli cases, reflect on Chevella
```

## Pre-visit brief

`POST /api/brief {farmerId, memoryEnabled}` builds the brief in [`src/lib/brief.ts`](src/lib/brief.ts):

1. **Memory ON:** recalls this farmer's memories plus similar cases from other farmers in the same
   village and crops. **Memory OFF:** skips recall entirely, so the model sees only the profile and
   the catalogue.
2. Groq (`src/lib/llm.ts`) returns JSON that is validated with zod. If it fails, it retries once with
   the error, then tries the fallback model, then returns a typed error.
3. Guardrails drop any product id not in `data/products.json`, and remove citation dates that don't
   match a recalled memory. Anything removed is listed in `warnings`.

Other routes: `GET /api/farmers`, `GET /api/farmers/:id`, `GET /api/memory/events?after=<id>`.
Sample outputs for F001 are in [`docs/brief-samples.md`](docs/brief-samples.md).

## Logging a visit

- `POST /api/transcribe`: multipart `audio` (webm/m4a/wav, under 2 minutes) plus an optional
  `language` (`te`, `en` or `auto`). Uses Groq Whisper `whisper-large-v3`. Empty recordings and
  silence get a clear error.
- `POST /api/visits/structure {farmerId, note}`: turns an English, Telugu or mixed note into a
  structured visit for the officer to review. Nothing is saved. Products mentioned in the note that
  aren't in the catalogue are flagged, never invented.
- `POST /api/visits {farmerId, note, structured?}`: saves the visit to `data/visits.runtime.json`
  (git-ignored) and retains it as `visit:<id>`. The response includes the memory event.
- `POST /api/outcomes {visitId, applied, result, yieldNote}`: retains the outcome as `outcome:<id>`.
- `npm run forget:docs -- visit:V037 outcome:V037`: deletes test documents from memory.

## Village insights

`GET /api/insights?village=<slug>&crop=<slug>` asks Hindsight `reflect` three fixed questions over
everything tagged `village:<slug>`:
1. What works for the most common problem?
2. How to handle price and brand objections.
3. What to watch for next month.

The questions run in parallel and each answer comes back with its source memories. Complete results
are cached in memory for 5 minutes. If one question fails, the others are still returned.

## Screens

The app is designed for phones first and works at 380px width.

| Route | What it does |
|---|---|
| `/` | Farmers list with search, a village filter and the last visit date |
| `/farmers/[id]` | Pre-visit brief with the **Memory ON/OFF** toggle, dated evidence chips, the claims memory supports, the recalled memories, and visit records with "Record outcome" |
| `/farmers/[id]/log` | Log a visit: record by voice (MediaRecorder, max 2 minutes) or type, edit the transcript, review the structured result, then save to memory |
| `/insights` | Village and crop picker; shows Hindsight's reflect answers with their sources |

The **Memory panel** appears on every screen: a right-hand drawer on desktop and a bottom sheet on
phones. It polls `/api/memory/events` every 2 seconds and shows each retain, recall and reflect with
its tags and latency.

## Demo page (`/demo`)

1. **Side by side:** Ramesh Goud's (F001) brief with Memory OFF and Memory ON.
2. **Replay history:** clears F001's memory, then retains his visits one at a time (each with its
   outcome). After every step it regenerates the brief for the next visit date. Recalls are
   limited to that date (`asOf`), so a brief never "remembers" the future.
3. **Learning curve:** a recharts line chart of the monthly acceptance rate and issue-controlled rate.
   It's computed from the data files and labelled as simulated field data.
4. **Reset demo:** re-retains only F001's seed documents by `document_id` and deletes any visits
   logged for F001 during the demo.

`POST /api/demo` accepts `{action: "reset" | "replay-start"}` or `{action: "replay-step", step}`.

## Author

Jeevitha Nanepalli
