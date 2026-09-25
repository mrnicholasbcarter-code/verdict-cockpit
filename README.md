# Verdict Cockpit

Read-only inspection surface for Trusted Change Reports and AutoDev Route Lab evidence.

Verdict Core plans and orchestrates the work and decides what evidence may authorize, Prime executes it, OmniRoute serves routes, workers produce changes, Git and CI provide source and check evidence. The Cockpit renders those decisions; it does not select models, score providers, mutate policy, or promote routes.

## Current slice

- Exact repository, base commit, patch commit, and patch digest binding
- Accepted, denied, and unknown change reports with independent check receipts
- OmniRoute-attributed route-used evidence
- Counterfactual route observations and advisory-only candidate recommendation
- Deterministic fixture mode rendered with the same typed contract projection intended for live reports

### ExecutionEnvelope v1 Explorer

Read-only fixture explorer for the canonical `ExecutionEnvelope` v1 contract from verdict-core.

**Path**: `/envelopes`

**Features**:
- Displays all 6 canonical fixtures from verdict-core @ `80ebaf2`
- Each fixture shows: verdict badge, policy digest, expiry, and eligibility decision
- Detail panel shows verification reason and full JSON
- Keyboard accessible, empty/error states handled
- Never presented as live evidence (visible "FIXTURE" badges)

**Fixtures** (vendored byte-for-byte from verdict-core):
- `accepted`: Valid envelope, all checks pass → ACCEPT
- `denied`: Eligibility denies execution → DENY
- `expired`: Envelope expired (expires_at in the past) → EXPIRED
- `null-defaults`: Optional fields are null → ACCEPT
- `unknown-field`: Contains unknown field (v1 rejects) → REJECT_UNKNOWN
- `wrong-digest`: policy_digest mismatch → DIGEST_MISMATCH

**Verifier** (`src/lib/verifyExecutionEnvelope.ts`): Pure TypeScript implementation of verdict-core verification rules. Never throws on untrusted input. Fail-closed semantics: schema validation → eligibility → digest → expiry.

**Vendored source**: `contracts/fixtures/execution-envelope/v1/` from verdict-core @ `80ebaf23278473bb48bde807c1c3867e980a6e14`. Manifest SHA-256 pins were recomputed from actual fixture content (original manifest had incorrect SHAs).

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

ExecutionEnvelope fixtures are vendored from verdict-core (not published in the npm registry at the time of implementation). The TypeScript verifier in `src/lib/verifyExecutionEnvelope.ts` implements the v1 contract rules documented in [verdict-core EXECUTION_ENVELOPE_V1.md](https://github.com/mrnicholasbcarter-code/verdict-core/blob/80ebaf23278473bb48bde807c1c3867e980a6e14/docs/contracts/EXECUTION_ENVELOPE_V1.md).
