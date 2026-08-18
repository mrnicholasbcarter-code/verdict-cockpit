# Verdict Cockpit

Read-only inspection surface for Trusted Change Reports and AutoDev Route Lab evidence.

Ruflo coordinates work, OmniRoute serves routes, workers produce changes, Git and CI provide source and check evidence, and Verdict decides what that evidence may authorize. The Cockpit renders those decisions; it does not select models, score providers, mutate policy, or promote routes.

## Current slice

- Exact repository, base commit, patch commit, and patch digest binding
- Accepted, denied, and unknown change reports with independent check receipts
- OmniRoute-attributed route-used evidence
- Counterfactual route observations and advisory-only candidate recommendation
- Deterministic fixture mode rendered with the same typed contract projection intended for live reports

There is no live Cockpit API in this repository. The current UI visibly labels fixture mode, and all displayed run IDs, commits, evidence digests, checks, route observations, costs, and latencies are illustrative deterministic data.

## Development

```bash
npm ci
npm run dev
```

Verification:

```bash
npm run lint
npm run typecheck
npm test -- --ci
npm run build
```

## Contract boundary

The fixture adapter imports canonical `RoutingDecision` and `OutcomeEvent` types from `@bodanglin/verdict-contracts`. Runtime input is validated locally because version `0.1.0` of that package exposes TypeScript declarations but no runtime parser export.
