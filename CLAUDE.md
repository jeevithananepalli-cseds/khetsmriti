# CLAUDE.md — KhetSmriti

This file tells Claude Code how to work in this repo. Read it fully before every task.

## What we are building

**KhetSmriti** ("field memory") is an AI agent for field officers of agri-input distributors
(seeds, fertilisers, crop protection). Before a farmer visit it produces a **pre-visit brief**
from everything it remembers about that farmer. After the visit the officer logs a short
voice/text note; the agent structures it and **retains** it. Over time it **learns which advice
actually works** per farmer, village and crop.

One-liner: *A field officer who never forgets a farmer — it remembers every visit, objection and
crop outcome, and learns which advice works in each village.*

Memory is the product. Without Hindsight, the agent is a generic chatbot. Every feature must make
the memory layer more visible or more useful. If a feature doesn't, don't build it.

## Stack (do not change without asking)

- Next.js 15 (App Router) + TypeScript (strict) + Tailwind CSS
- Memory: Hindsight Cloud via `@vectorize-io/hindsight-client`
- LLM: Groq, primary `openai/gpt-oss-120b`, fallback `qwen/qwen3-32b`
- Speech-to-text: Groq Whisper (`whisper-large-v3`) — Telugu + English
- Validation: `zod` for every LLM output and every API input
- Charts: `recharts`
- Local data: JSON files in `/data` (farmers, villages, products). No database for the MVP.
- Package manager: `npm`

## Environment variables (`.env.local`, never commit)

```
HINDSIGHT_BASE_URL=        # from Hindsight Cloud dashboard
HINDSIGHT_API_KEY=         # from Hindsight Cloud dashboard
HINDSIGHT_BANK_ID=khetsmriti-demo
GROQ_API_KEY=
GROQ_MODEL_PRIMARY=openai/gpt-oss-120b
GROQ_MODEL_FALLBACK=qwen/qwen3-32b
```

Commit a `.env.example` with the same keys and empty values.

## Hindsight rules (the most important section)

Before writing Hindsight code, fetch and read these docs; do not guess the API:
- https://hindsight.vectorize.io/sdks/nodejs
- https://hindsight.vectorize.io/developer/api/retain
- https://hindsight.vectorize.io/developer/api/recall
- https://hindsight.vectorize.io/developer/api/reflect
- https://hindsight.vectorize.io/developer/api/memory-banks
- https://hindsight.vectorize.io/developer/api/mental-models

Confirm how the client authenticates against Hindsight Cloud (API key option / header) from the
docs or the Cloud dashboard before coding it.

All Hindsight calls go through ONE module: `src/lib/memory.ts`. No other file imports the client.
Every call in that module also pushes an entry to the in-memory **memory event log**
(`src/lib/memoryLog.ts`) so the UI can show retain/recall/reflect live.

### Bank
- One bank: `HINDSIGHT_BANK_ID`. Created by `npm run setup:bank` with:
  - **mission**: "I am the field memory of an agri-input distributor. I remember every farmer
    visit, the advice given, the farmer's objections and the crop outcome, so that field officers
    give advice that has actually worked for this farmer and this village."
  - **directives**: "Only recommend products that appear in the provided product catalogue.",
    "Never state a dosage that is not in the catalogue.", "Always cite the visit date that
    supports a claim.", "If there is no history, say so plainly."

### Tag scheme (use exactly these prefixes)
- `farmer:<farmerId>` e.g. `farmer:F001`
- `village:<slug>` e.g. `village:chevella`
- `crop:<slug>` e.g. `crop:chilli`
- `officer:<officerId>` e.g. `officer:O01`
- `kind:visit` | `kind:outcome`

### Retain
- One retain per visit, `document_id = visit:<visitId>`; outcome updates use
  `document_id = outcome:<visitId>`.
- Always pass `timestamp` = the visit date (ISO) so temporal recall works for seeded history.
- Always pass `context` = `"field visit"` or `"crop outcome follow-up"`.
- Pass `metadata` = `{ farmerId, visitId, village, crop, officerId }` (strings).
- Pass `tags` per the scheme above and `observation_scopes: "per_tag"` so Hindsight builds
  separate observations per farmer, per village and per crop.
- Content is a readable narrative written from the structured visit, e.g.
  "Visit on 2026-04-12 to Ramesh (F001), Chevella, chilli at vegetative stage. Issue: leaf
  blight. Advised Blitox 50 WP (P007). Farmer objected to price (₹620/500g). Officer: O01."

### Recall
- Pre-visit: recall scoped to `farmer:<id>`, query describing the upcoming visit.
- Similar cases: a second recall scoped to `village:<slug>` + `crop:<slug>` for the same issue.
- Use `types: ['world','experience','observation']`, `budget: 'mid'`.

### Reflect
- Village insights: `reflect` with tag filter `village:<slug>`, question like
  "Which advice for chilli leaf blight has worked in this village, and how should officers
  handle price objections here?"

### Memory OFF mode
- A global toggle (`memoryEnabled`) in the UI. When OFF, the brief is generated WITHOUT any
  recall (only the farmer profile + catalogue). This is the "before" in the demo. Never fake it.

## LLM rules
- All Groq calls go through `src/lib/llm.ts`.
- Use JSON mode / structured output and validate with zod. On invalid JSON or a tool-call error:
  retry once with the error message appended, then fall back to `GROQ_MODEL_FALLBACK`, then
  return a typed error the UI can show. Never crash a page on an LLM error.
- Product guardrail: the LLM may only return `productId`s that exist in `data/products.json`.
  Validate after the call; drop and flag any unknown ID.
- Keep prompts in `src/prompts/*.ts` as exported template functions, not inline strings.

## Code conventions
- `src/app` routes, `src/components` UI, `src/lib` logic, `src/types` shared types, `src/prompts`.
- Server-only code (Hindsight, Groq keys) must never be imported into client components.
- Small functions, explicit types, no `any`.
- Every API route: zod-validate input, try/catch, return `{ ok: true, data }` or
  `{ ok: false, error }`.
- Write README sections as you build features, not at the end.

## UI rules
- Mobile-first (field officers use phones), works at 380px width.
- Screens: Farmers list · Pre-visit brief · Log visit · Village insights · Memory panel (drawer
  visible on every screen showing live retain/recall/reflect events with their tags).
- Show citations: each claim in a brief shows the visit date it came from.
- Rupee amounts as `₹1,240`; dates as `12 Apr 2026`.

## Content rules (for any README, article, post)
- Never write the word "hackathon" anywhere.

## Definition of done for any task
1. `npm run build` passes with zero TypeScript errors.
2. `npm run lint` passes.
3. The feature works end to end in the browser against real Hindsight + Groq.
4. README updated if behaviour changed.
5. Commit with a clear message.
