# Verdict Cockpit — AI Routing Decision Dashboard

A portfolio-ready, fixture-driven dashboard that visualizes **policy-gated AI model routing** decisions. It replaces the earlier quantitative-trading / order-book framing with a clear view of how a routing layer selects a model, why candidates were rejected, provider health, and cost/latency trade-offs.

> **Demo data only.** This surface is driven entirely by bundled fixtures in `src/lib/routingStore.ts`. It does **not** call any live Verdict Core API, WebSocket, or external service. No API shape is invented.

## What the dashboard shows

- **Selected model** — the model chosen by the active policy gate, with provider, estimated cost, and expected latency.
- **Rejected candidates** — every other candidate with the explicit rejection reason (cost threshold, latency ceiling, capability floor, or composite score).
- **Provider health & freshness** — per-provider status, latency, success rate, and last-check timestamp.
- **Cost / latency** — P50 / P99 latency and cost-per-1k-tokens for each candidate.
- **Fallback status** — the designated fallback model used when the selected provider is unavailable.

## Policy gates

Switch the routing policy at runtime to see how the decision changes:

| Gate | Behavior |
|------|----------|
| `cost-aware` | Prefers lower cost-per-1k-tokens within acceptable capability. |
| `latency-first` | Prefers lowest P50 latency. |
| `quality-first` | Prefers highest capability score. |
| `balanced` | Composite of cost, latency, and capability. |

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
npm start

# Run tests
npm test

# Type-check / lint
npx tsc --noEmit
npm run lint
```

## Architecture

```
verdict-cockpit/
├── src/
│   ├── pages/
│   │   ├── _app.tsx          # Next.js app shell + global styles
│   │   └── index.tsx         # Cockpit dashboard (AI routing decision view)
│   ├── lib/
│   │   └── routingStore.ts   # Zustand store + demo fixtures (no live API)
│   ├── hooks/
│   │   └── useRouting.ts      # Routing selectors/actions wrapper
│   └── styles/
│       └── globals.css        # Tailwind + glass-panel / metric-card utilities
├── tests/                     # Jest + React Testing Library
└── tailwind.config.ts
```

## Scope & limitations

- This is a **portfolio demo**; all data is synthetic and deterministic from fixtures.
- It intentionally does **not** invent a live Core API contract. When wiring to a real backend, replace the fixture evaluation in `routingStore.ts` with the actual eligibility/gate response.
- No external services (WebSocket, REST, auth) are invoked from the UI.
