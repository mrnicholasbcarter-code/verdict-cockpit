# Verdict Cockpit — Next.js Dashboard

Real-time routing management console for the Verdict ecosystem.

## Features

- **Policy Editor** — YAML/TOML policy management with validation
- **Model Catalog** — Live model pricing, latency, capability matrix
- **Live Routing Telemetry** — WebSocket stream of routing decisions
- **Eligibility Gate Visualizer** — See why models were included/excluded
- **Cost/Latency Analytics** — P50/P95/P99, cost per 1k tokens
- **A/B Testing** — Compare routing policies side-by-side

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
npm start
```

## Architecture

```
verdict-cockpit/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── components/        # React components
├── lib/                   # Shared utilities
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript types (shared with verdict-node)
```

## Environment

```env
NEXT_PUBLIC_VERDICT_API=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

## Links

- **Verdict Core**: https://github.com/verdict/verdict-core
- **Verdict Node**: https://github.com/verdict/verdict-node
