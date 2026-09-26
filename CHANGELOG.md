# Changelog

All notable changes to verdict-cockpit are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.0] - 2026-09-26

### Added
- **ExecutionEnvelopes explorer page** (`/envelopes`): browse, filter, and inspect
  `ExecutionEnvelope v1` records sourced from canonical verdict-core fixtures
  (BOD-14, AC items 5–8).  Filters cover decision, route, reason, timestamp,
  evidence status, and claim status.  Details panel shows provenance fields
  (`policy_digest`, `created_at`, `expires_at`, `route`) and the verification
  status/reason with omitted-field list.
- **Receipt explorer rebuild** (BOD-14): replaced the earlier stub with a fully
  implemented explorer backed by Zod-validated canonical Core fixtures; all
  hand-written validation removed in favour of `@bodanglin/verdict-contracts`.
- **Route Lab acceptance evidence** (`feat/cock-001-route-lab`): interactive
  route-lab panel wired to acceptance-evidence fixtures.
- **Node 20/22 CI build matrix**: catches SSR/prerender regressions across both
  active Node LTS versions.

### Changed
- `@bodanglin/verdict-contracts` dependency bumped to `^0.3.0` (published).
- Compat manifest re-baselined to verdict-core 0.3.0
  (commit `d0da31a8f0747a79`); `RoutingDecisionContract` hash
  regenerated to match.
- `next` upgraded to 15.5.26 (critical advisory clearance).
- CONTRIBUTING guide updated to replace the unenforced 100 % coverage claim
  with accurate guidance.

### Maintenance
- MIT license file corrected to full text.
- Package name and README aligned with canonical repository identity.

### Fixed
- **Node 20 build**: bundle the ESM-only `@bodanglin/verdict-contracts` package via
  `transpilePackages` in `next.config.js`; `next build` now passes on Node 20 and 22.

## [0.1.0] - 2026-08-18

- Initial release: Next.js dashboard skeleton with Zustand trading-store,
  unit tests, CI, compat-manifest gate, and route-lab panel.
