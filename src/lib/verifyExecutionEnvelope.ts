/**
 * ExecutionEnvelope v1 Verifier
 * 
 * Implements the verification rules from verdict-core:
 * https://github.com/mrnicholasbcarter-code/verdict-core/blob/bd70412f8050f89a8a8b6fd9c914e3cdadbf112f/docs/contracts/EXECUTION_ENVELOPE_V1.md
 * 
 * NEVER throws on untrusted input; malformed data returns REJECT_UNKNOWN.
 * 
 * Verification order (fail-closed):
 * 1. Schema validation (unknown fields, wrong types, structural errors)
 * 2. Eligibility check
 * 3. Digest check  
 * 4. Expiry check
 *
 * NOTE: This is a STRICT verifier that validates task_spec and verification_requirements
 * for unknown keys to match Core Zod/Python parity.
 */

export type EnvelopeVerdict =
  | 'ACCEPT'
  | 'DENY'
  | 'EXPIRED'
  | 'DIGEST_MISMATCH'
  | 'REJECT_UNKNOWN';

interface EligibilityDecision {
  admitted?: boolean;
  denied?: boolean | string;
  decision?: string;
  [key: string]: unknown;
}

interface ExecutionConstraints {
  // Canonical keys (unknown keys → REJECT_UNKNOWN)
  allowed_models?: string[];
  allowed_tools?: string[];
  allowed_agents?: string[];
  budget_usd?: number;
  max_request_usd?: number;
  max_latency_ms?: number;
  risk_ceiling?: string;
  required_verification?: string[];
  expires_at?: string;
}

const REQUIRED_FIELDS = [
  'task_spec',
  'eligibility_decision',
  'policy_digest',
  'allowed_capabilities',
  'execution_constraints',
  'verification_requirements',
  'evidence_ids',
  'schema_version',
];

const ALLOWED_FIELDS = [
  ...REQUIRED_FIELDS,
  'routing_decision',
  'created_at',
];

const CANONICAL_CONSTRAINT_KEYS = [
  'allowed_models',
  'allowed_tools',
  'allowed_agents',
  'budget_usd',
  'max_request_usd',
  'max_latency_ms',
  'risk_ceiling',
  'required_verification',
  'expires_at',
];

const CANONICAL_TASK_SPEC_KEYS = [
  'approvals',
  'budget',
  'capabilities',
  'context',
  'context_requirements',
  'criticality',
  'degraded_mode_policy',
  'destructive_operation',
  'effort',
  'latency',
  'latency_limit_ms',
  'metadata',
  'objective',
  'parallelism',
  'privacy',
  'production_impact',
  'reasoning',
  'required_capabilities',
  'risk',
  'schema_version',
  'task_type',
  'tool_requirements',
  'tools',
  'verification',
  'workflow',
];

const CANONICAL_VERIFICATION_KEYS = [
  'checks',
  'on_failure',
  'schema_version',
];

const VALID_RISK_LEVELS = ['unknown', 'low', 'medium', 'high', 'critical'];

/**
 * Check if a value is a plain object (not null, not array).
 */
function isPlainObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if a value is a non-negative integer.
 * Note: 1.0 counts as an integer, 1.5 does not.
 */
function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value) && 
         value >= 0 && Math.floor(value) === value;
}

/**
 * Check if a value is a non-negative number (including floats).
 */
function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value) && value >= 0;
}

/**
 * Check if a value is an array of strings.
 */
function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

/**
 * Check if a value is an array of non-empty strings.
 */
function isNonEmptyStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(item => typeof item === 'string' && item.length > 0);
}

/**
 * Verify an ExecutionEnvelope against the v1 contract rules.
 * 
 * @param envelope - The envelope to verify
 * @param now - ISO 8601 timestamp with timezone (REQUIRED)
 * @param expectedPolicyDigest - Expected SHA-256 hex digest (REQUIRED, lowercase, no prefix)
 * @returns Verdict (never throws)
 */
export function verifyExecutionEnvelope(
  envelope: unknown,
  now: string,
  expectedPolicyDigest: string,
): EnvelopeVerdict {
  try {
    // 1. Schema validation
    if (!isPlainObject(envelope)) {
      return 'REJECT_UNKNOWN';
    }

    const env = envelope as Record<string, unknown>;

    // Check for required fields
    for (const field of REQUIRED_FIELDS) {
      if (!(field in env)) {
        return 'REJECT_UNKNOWN';
      }
    }

    // Check for unknown fields (v1 rejects them)
    for (const field of Object.keys(env)) {
      if (!ALLOWED_FIELDS.includes(field)) {
        return 'REJECT_UNKNOWN';
      }
    }

    // Type guards for top-level fields
    if (
      typeof env.schema_version !== 'string' ||
      typeof env.policy_digest !== 'string' ||
      !isPlainObject(env.eligibility_decision) ||
      !isPlainObject(env.execution_constraints) ||
      !isPlainObject(env.task_spec) ||
      !isPlainObject(env.verification_requirements)
    ) {
      return 'REJECT_UNKNOWN';
    }

    // Validate task_spec for unknown keys and required keys
    const taskSpec = env.task_spec as Record<string, unknown>;
    for (const key of Object.keys(taskSpec)) {
      if (!CANONICAL_TASK_SPEC_KEYS.includes(key)) {
        return 'REJECT_UNKNOWN';
      }
    }
    // task_spec must have at least schema_version
    if (!('schema_version' in taskSpec)) {
      return 'REJECT_UNKNOWN';
    }

    // Validate verification_requirements for unknown keys and required keys
    const verification = env.verification_requirements as Record<string, unknown>;
    for (const key of Object.keys(verification)) {
      if (!CANONICAL_VERIFICATION_KEYS.includes(key)) {
        return 'REJECT_UNKNOWN';
      }
    }
    // verification_requirements must have at least schema_version
    if (!('schema_version' in verification)) {
      return 'REJECT_UNKNOWN';
    }

    // Validate allowed_capabilities (must be array of strings)
    if (!isStringArray(env.allowed_capabilities)) {
      return 'REJECT_UNKNOWN';
    }

    // Validate evidence_ids (must be array of strings)
    if (!isStringArray(env.evidence_ids)) {
      return 'REJECT_UNKNOWN';
    }

    // Validate schema_version (must be "1")
    if (env.schema_version !== '1') {
      return 'REJECT_UNKNOWN';
    }

    // Validate optional fields if present
    if ('routing_decision' in env) {
      // Must be null or a plain object
      if (env.routing_decision !== null && !isPlainObject(env.routing_decision)) {
        return 'REJECT_UNKNOWN';
      }
    }

    if ('created_at' in env) {
      // Must be null or a string
      if (env.created_at !== null && typeof env.created_at !== 'string') {
        return 'REJECT_UNKNOWN';
      }
    }

    const eligibility = env.eligibility_decision as EligibilityDecision;
    const constraints = env.execution_constraints as Record<string, unknown>;

    // Validate execution_constraints keys (unknown key → REJECT_UNKNOWN)
    for (const key of Object.keys(constraints)) {
      if (!CANONICAL_CONSTRAINT_KEYS.includes(key)) {
        return 'REJECT_UNKNOWN';
      }
    }

    // Validate execution_constraints values
    if ('budget_usd' in constraints) {
      if (!isNonNegativeNumber(constraints.budget_usd)) {
        return 'REJECT_UNKNOWN';
      }
    }

    if ('max_request_usd' in constraints) {
      if (!isNonNegativeNumber(constraints.max_request_usd)) {
        return 'REJECT_UNKNOWN';
      }
    }

    if ('max_latency_ms' in constraints) {
      if (!isNonNegativeInteger(constraints.max_latency_ms)) {
        return 'REJECT_UNKNOWN';
      }
    }

    if ('risk_ceiling' in constraints) {
      if (typeof constraints.risk_ceiling !== 'string' || 
          !VALID_RISK_LEVELS.includes(constraints.risk_ceiling)) {
        return 'REJECT_UNKNOWN';
      }
    }

    if ('allowed_models' in constraints) {
      if (!isNonEmptyStringArray(constraints.allowed_models)) {
        return 'REJECT_UNKNOWN';
      }
    }

    if ('allowed_tools' in constraints) {
      if (!isNonEmptyStringArray(constraints.allowed_tools)) {
        return 'REJECT_UNKNOWN';
      }
    }

    if ('allowed_agents' in constraints) {
      if (!isNonEmptyStringArray(constraints.allowed_agents)) {
        return 'REJECT_UNKNOWN';
      }
    }

    if ('required_verification' in constraints) {
      if (!isNonEmptyStringArray(constraints.required_verification)) {
        return 'REJECT_UNKNOWN';
      }
    }

    // expires_at must be a string if present (we check for presence later)
    if ('expires_at' in constraints && typeof constraints.expires_at !== 'string') {
      return 'REJECT_UNKNOWN';
    }

    // 2. Eligibility check (before expiry)
    // admitted must be true AND no contradictory signals
    if (eligibility.admitted !== true) {
      return 'DENY';
    }

    // Check for contradictory deny signals
    if (eligibility.denied) {
      return 'DENY';
    }

    if (eligibility.decision && eligibility.decision !== 'accept') {
      return 'DENY';
    }

    // 3. Digest check
    // Must be exactly 64 lowercase hex chars, no "sha256:" prefix
    if (!env.policy_digest) {
      return 'REJECT_UNKNOWN';
    }

    // Check format: exactly 64 lowercase hex chars
    const digestRegex = /^[a-f0-9]{64}$/;
    if (!digestRegex.test(env.policy_digest)) {
      return 'REJECT_UNKNOWN';
    }

    // Check if it matches expected (well-formed but different → DIGEST_MISMATCH)
    if (env.policy_digest !== expectedPolicyDigest) {
      return 'DIGEST_MISMATCH';
    }

    // 4. Expiry check (expires_at is REQUIRED for non-denied envelopes)
    if (!constraints.expires_at || typeof constraints.expires_at !== 'string') {
      return 'EXPIRED';
    }

    // Parse timestamps
    let nowDate: Date;
    let expiresDate: Date;

    try {
      nowDate = new Date(now);
      expiresDate = new Date(constraints.expires_at);

      // Check for timezone-naive or invalid timestamps
      if (isNaN(nowDate.getTime()) || isNaN(expiresDate.getTime())) {
        return 'EXPIRED';
      }

      // Check for timezone-naive (ISO without Z or offset)
      // A proper ISO 8601 with timezone must end with Z or ±HH:MM
      const tzRegex = /[Zz]|[+-]\d{2}:\d{2}$/;
      if (!tzRegex.test(now) || !tzRegex.test(constraints.expires_at)) {
        return 'EXPIRED';
      }

      // Check expiry
      if (nowDate >= expiresDate) {
        return 'EXPIRED';
      }
    } catch {
      return 'EXPIRED';
    }

    // All checks passed
    return 'ACCEPT';
  } catch {
    // Never throw on untrusted input
    return 'REJECT_UNKNOWN';
  }
}
