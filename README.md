# llm-gate-cockpit

Real-time React/TypeScript dashboard for monitoring algorithmic crypto and
prediction-market trades routed through the llm-gate ecosystem.

Built with Next.js, TypeScript, Zustand (atomic state) and Framer Motion for
60fps order-book delta animations.

## Features

- Zero-latency WebSockets: `useOrderBook` binds directly to streaming L2 deltas.
- Atomic state: Zustand slices avoid React context re-render thrashing on fast
  market moves.
- Virtualized order book: `VirtualizedOrderBook` renders deep books without
  dropping frames.
- Risk authority UI: live visualization of `llm-gate-risk` telemetry.

## Quickstart

```bash
npm install
npm run dev      # http://localhost:3000
```

## Scripts

- `npm run dev` — start the Next.js dev server.
- `npm run build` — production build.
- `npm run start` — serve the production build.
- `npm test` — run the Jest suite.

## Project layout

```
src/
  components/   UI (VirtualizedOrderBook, ...)
  hooks/        useOrderBook and other data hooks
  lib/          tradingStore (Zustand) and helpers
  pages/        Next.js routes
  styles/       global CSS
tests/          Jest tests
```

## Related repos

- `llm-gate-core` — routing/eligibility control plane
- `llm-gate-risk` — trade risk engine feeding this dashboard
- `llm-gate-strategy` — edge-mining framework
- `llm-gate-backtest` — backtest harness

## License

MIT
