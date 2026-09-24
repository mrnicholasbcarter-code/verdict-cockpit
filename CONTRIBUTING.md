# Contributing

Verdict Cockpit is a **read-only**, fixture-mode Next.js viewer for Verdict change reports and route-lab evidence. It renders decisions. It must not select models, score providers, change policy, or promote routes.

## Setup

Node.js 20 (CI) and npm:

```bash
npm ci
npm run dev        # local UI with deterministic fixtures
```

Verify before opening a pull request:

```bash
npm run lint
npm run typecheck
npm test -- --ci
npm run build
```

CI also runs `verdict compat check` against `.verdict/compat-manifest.json` with verdict-core installed.

## Expectations

- Add or update tests in `tests/` for UI or store behavior changes.
- Label fixture data as illustrative. Do not present it as live data.
- There is no enforced coverage threshold. Current line coverage is about 94% (`npx jest --coverage`).

## Pull requests

One logical change per PR, with a description of what changed and how it was verified.
