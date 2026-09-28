# Pre-visit brief samples — F001 Ramesh Goud

Generated with `POST /api/brief` against real Hindsight + Groq, visit date 2026-09-28.
The only difference between the two calls is `memoryEnabled`.

```bash
curl -s -X POST localhost:3000/api/brief -H "content-type: application/json" \n  -d '{"farmerId":"F001","memoryEnabled":false}'
```

## Memory OFF (profile + catalogue only)

```json
{
  "brief": {
    "headline": "Control key pests on chilli and cotton while staying within a tight budget",
    "lastVisitSummary": "No history with this farmer yet.",
    "whatToCheck": [
      "Inspect chilli for fruit borer and leaf blight signs",
      "Examine cotton for pink bollworm and boll formation health",
      "Assess overall leaf health for any fungal symptoms",
      "Check soil moisture and borewell irrigation performance",
      "Look for zinc deficiency symptoms such as interveinal yellowing",
      "Confirm any previous fertilizer applications this season"
    ],
    "recommendedProducts": [
      {
        "productId": "P002",
        "why": "Budget insecticide effective against pink bollworm and fruit borer in both chilli and cotton",
        "evidence": "Standard recommendation for these crops"
      },
      {
        "productId": "P008",
        "why": "Low‑cost fungicide covering leaf blight and fruit rot common in chilli at this stage",
        "evidence": "Standard recommendation for these crops"
      },
      {
        "productId": "P012",
        "why": "Budget nitrogen source to boost growth on red sandy loam soils",
        "evidence": "Standard recommendation for these crops"
      },
      {
        "productId": "P014",
        "why": "Affordable zinc supplement to address likely zinc deficiency in the soil",
        "evidence": "Standard recommendation for these crops"
      }
    ],
    "howToPitch": "Emphasise that Profex Super and Indofil M‑45 together cost under ₹1,000 per acre and give reliable pest and disease control; neighbours using the same combo have reported healthy yields, so the investment is safe for a price‑sensitive farmer like Ramesh.",
    "openQuestions": [
      "What pest damage have you observed on chilli or cotton this season?",
      "Which insecticides or fungicides have you used before and how much did they cost?",
      "Are you seeing any leaf spots, blight or yellowing on the chilli plants?",
      "Do you have enough budget for the recommended products this crop cycle?",
      "Have you applied any nitrogen or zinc fertilizers this year, and if so, how much?"
    ],
    "claims": [],
    "confidence": "low"
  },
  "memoryEnabled": false,
  "visitDate": "2026-09-28",
  "model": "openai/gpt-oss-120b",
  "attempts": 1,
  "warnings": [],
  "farmerMemoriesRecalled": 0,
  "similarMemoriesRecalled": 0
}
```

## Memory ON (recall: farmer + similar Chevella cases)

```json
{
  "brief": {
    "headline": "Treat early chilli leaf blight with Blitox and protect cotton squares with Ulala",
    "lastVisitSummary": "2026-08-26 – Officer O01 advised Blitox 50 WP (P007) for early leaf blight in chilli; farmer accepted and requested the product. Earlier on 2026-08-04 Ulala (P003) successfully controlled cotton sucking pests.",
    "whatToCheck": [
      "Inspect chilli leaves for first blight spots and % of plants affected",
      "Check cotton squares for hopper‑burn or pest damage",
      "Confirm any recent sprays applied and their dates",
      "Assess soil moisture level for both crops",
      "Ask about any visible pest insects on cotton leaves"
    ],
    "recommendedProducts": [
      {
        "productId": "P007",
        "why": "Proven to control leaf blight in Ramesh's chilli crop",
        "evidence": "2026-05-02 leaf blight was controlled after two sprays of Blitox at 500 g/acre"
      },
      {
        "productId": "P003",
        "why": "Effectively stopped cotton sucking pests and protected squares",
        "evidence": "2026-08-14 cotton pest damage ceased after Ulala at 60 g/acre"
      }
    ],
    "howToPitch": "Explain that Blitox costs only ₹420 per 500 g and has already saved his chilli yield (see 2024‑05‑02 result); show neighbour's yield data that convinced him before. For cotton, Ulala is ₹430 per 60 g and proved to stop hopper‑burn on 2026‑08‑14, protecting the next boll crop. Emphasise the low per‑acre cost versus the potential loss of yield, addressing his price sensitivity.",
    "openQuestions": [
      "Did you apply any spray on chilli after the last visit?",
      "What pest signs have you noticed on cotton squares this week?",
      "Do you have any budget limits for this spray cycle?",
      "Would you prefer a single spray or two sprays spaced 10 days apart for chilli?",
      "How many acres of each crop need treatment today?"
    ],
    "claims": [
      {
        "text": "Blitox 50 WP controlled leaf blight when applied at 500 g per acre in 200 L water.",
        "sourceVisitDate": "2026-05-02"
      },
      {
        "text": "Ramesh accepted Blitox advice without objection after seeing neighbour's yield data.",
        "sourceVisitDate": "2026-04-21"
      },
      {
        "text": "Ulala at 60 g per acre stopped cotton sucking pests and retained squares.",
        "sourceVisitDate": "2026-08-14"
      },
      {
        "text": "Ramesh is highly price‑sensitive and previously objected to expensive fertilizer.",
        "sourceVisitDate": "2026-06-18"
      },
      {
        "text": "Amistar Top was rejected and leaf blight spread to 40% of plants.",
        "sourceVisitDate": "2026-04-18"
      },
      {
        "text": "Gromor DAP improved cotton vigor but gave only partial control of phosphorus deficiency.",
        "sourceVisitDate": "2026-06-18"
      }
    ],
    "confidence": "high"
  },
  "memoryEnabled": true,
  "visitDate": "2026-09-28",
  "model": "openai/gpt-oss-120b",
  "attempts": 2,
  "warnings": [],
  "farmerMemoriesRecalled": 47,
  "similarMemoriesRecalled": 57
}
```
