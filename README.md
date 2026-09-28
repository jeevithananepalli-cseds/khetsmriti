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

## Author

Jeevitha Nanepalli
