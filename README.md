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

## Author

Jeevitha Nanepalli
