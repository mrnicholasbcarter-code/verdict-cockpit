# ExecutionEnvelope v1 Fixtures

Source: verdict-core @ bd70412f8050f89a8a8b6fd9c914e3cdadbf112f
Contract: https://github.com/mrnicholasbcarter-code/verdict-core/blob/bd70412f8050f89a8a8b6fd9c914e3cdadbf112f/docs/contracts/EXECUTION_ENVELOPE_V1.md

These fixtures are vendored byte-for-byte from verdict-core.

## v1/ - Base Fixtures

See `manifest.json` for SHA-256 pins and expected verdicts.

| File | Expected Verdict | Description |
|------|-----------------|-------------|
| accepted.json | ACCEPT | Valid envelope, all checks pass |
| denied.json | DENY | Eligibility decision denies execution |
| expired.json | EXPIRED | Envelope expired (expires_at in the past) |
| null-defaults.json | ACCEPT | Optional fields are null |
| unknown-field.json | REJECT_UNKNOWN | Contains an unknown field (v1 rejects) |
| wrong-digest.json | DIGEST_MISMATCH | policy_digest does not match expected |

**Manifest SHA-256**: Verify with `sha256sum v1/manifest.json`

## v1-mutations/ - Mutation Corpus

34 test cases that override top-level keys of `accepted.json` to test Python/TypeScript/Zod validation parity.

**Manifest**: See `manifest.json` for the cases.json digest (`sha256:<hex>`).

**Format**: Each case has:
- `id`: Test case identifier
- `base`: Base fixture filename (typically "accepted.json")
- `override`: Top-level keys to replace
- `expected_verdict`: Expected verification result

**Usage**: Load base, apply override (shallow merge), verify with manifest `evaluation_time` and `expected_policy_digest`.

**Manifest SHA-256**: Verify with `sha256sum v1-mutations/manifest.json`

## Verification

See `src/lib/verifyExecutionEnvelope.ts` for the TypeScript verifier that implements the Core verification rules.

Test coverage includes:
- Raw-file SHA-256 verification for all v1 fixtures
- Expected verdict validation for all v1 fixtures
- All 34 v1-mutations corpus cases
- Garbage input table (never ACCEPT, never throw)
