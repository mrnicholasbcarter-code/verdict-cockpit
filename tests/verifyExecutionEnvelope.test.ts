/**
 * Tests for ExecutionEnvelope v1 verifier
 */

import { verifyExecutionEnvelope } from '@/lib/verifyExecutionEnvelope';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

const fixturesDir = join(__dirname, '../contracts/fixtures/execution-envelope/v1');
const mutationsDir = join(__dirname, '../contracts/fixtures/execution-envelope/v1-mutations');

// Load v1 fixtures and manifest
const v1Manifest = JSON.parse(readFileSync(join(fixturesDir, 'manifest.json'), 'utf-8'));
const acceptedFixture = JSON.parse(readFileSync(join(fixturesDir, 'accepted.json'), 'utf-8'));
const deniedFixture = JSON.parse(readFileSync(join(fixturesDir, 'denied.json'), 'utf-8'));
const expiredFixture = JSON.parse(readFileSync(join(fixturesDir, 'expired.json'), 'utf-8'));
const nullDefaultsFixture = JSON.parse(readFileSync(join(fixturesDir, 'null-defaults.json'), 'utf-8'));
const unknownFieldFixture = JSON.parse(readFileSync(join(fixturesDir, 'unknown-field.json'), 'utf-8'));
const wrongDigestFixture = JSON.parse(readFileSync(join(fixturesDir, 'wrong-digest.json'), 'utf-8'));

const v1Fixtures: Record<string, any> = {
  'accepted.json': acceptedFixture,
  'denied.json': deniedFixture,
  'expired.json': expiredFixture,
  'null-defaults.json': nullDefaultsFixture,
  'unknown-field.json': unknownFieldFixture,
  'wrong-digest.json': wrongDigestFixture,
};

// Load v1-mutations corpus
const mutationsManifest = JSON.parse(readFileSync(join(mutationsDir, 'manifest.json'), 'utf-8'));
const mutationCases = JSON.parse(readFileSync(join(mutationsDir, 'cases.json'), 'utf-8'));

const EVALUATION_TIME = v1Manifest.evaluation_time;
const EXPECTED_POLICY_DIGEST = v1Manifest.expected_policy_digest;
const MUTATIONS_EVALUATION_TIME = mutationsManifest.evaluation_time;

describe('verifyExecutionEnvelope', () => {
  describe('v1 fixture verification', () => {
    test('accepted.json -> ACCEPT', () => {
      const verdict = verifyExecutionEnvelope(
        acceptedFixture,
        EVALUATION_TIME,
        EXPECTED_POLICY_DIGEST
      );
      expect(verdict).toBe('ACCEPT');
    });

    test('denied.json -> DENY', () => {
      const verdict = verifyExecutionEnvelope(
        deniedFixture,
        EVALUATION_TIME,
        EXPECTED_POLICY_DIGEST
      );
      expect(verdict).toBe('DENY');
    });

    test('expired.json -> EXPIRED', () => {
      const verdict = verifyExecutionEnvelope(
        expiredFixture,
        EVALUATION_TIME,
        EXPECTED_POLICY_DIGEST
      );
      expect(verdict).toBe('EXPIRED');
    });

    test('null-defaults.json -> ACCEPT', () => {
      const verdict = verifyExecutionEnvelope(
        nullDefaultsFixture,
        EVALUATION_TIME,
        EXPECTED_POLICY_DIGEST
      );
      expect(verdict).toBe('ACCEPT');
    });

    test('unknown-field.json -> REJECT_UNKNOWN', () => {
      const verdict = verifyExecutionEnvelope(
        unknownFieldFixture,
        EVALUATION_TIME,
        EXPECTED_POLICY_DIGEST
      );
      expect(verdict).toBe('REJECT_UNKNOWN');
    });

    test('wrong-digest.json -> DIGEST_MISMATCH', () => {
      const verdict = verifyExecutionEnvelope(
        wrongDigestFixture,
        EVALUATION_TIME,
        EXPECTED_POLICY_DIGEST
      );
      expect(verdict).toBe('DIGEST_MISMATCH');
    });
  });

  describe('v1 manifest integrity', () => {
    test('all fixtures match their manifest SHA-256', () => {
      for (const [filename, expectedData] of Object.entries(v1Manifest.fixtures) as [string, any][]) {
        const filePath = join(fixturesDir, filename);
        const fileContent = readFileSync(filePath, 'utf-8');
        const actualSha256 = createHash('sha256').update(fileContent).digest('hex');
        
        expect(actualSha256).toBe(expectedData.sha256);
      }
    });

    test('all fixtures match their expected verdicts', () => {
      for (const [filename, expectedData] of Object.entries(v1Manifest.fixtures) as [string, any][]) {
        const fixture = v1Fixtures[filename];
        const verdict = verifyExecutionEnvelope(
          fixture,
          EVALUATION_TIME,
          EXPECTED_POLICY_DIGEST
        );
        
        expect(verdict).toBe(expectedData.expected_verdict);
      }
    });
  });

  describe('v1-mutations corpus', () => {
    test('cases.json matches manifest digest', () => {
      const casesContent = readFileSync(join(mutationsDir, 'cases.json'), 'utf-8');
      const actualSha256 = createHash('sha256').update(casesContent).digest('hex');
      const expectedDigest = mutationsManifest.cases_digest.replace('sha256:', '');
      
      expect(actualSha256).toBe(expectedDigest);
    });

    test.each(mutationCases)('$id -> $expected_verdict', (testCase) => {
      // Load base fixture
      const baseFixture = JSON.parse(
        readFileSync(join(fixturesDir, testCase.base), 'utf-8')
      );

      // Apply override (replace top-level keys)
      const envelope = { ...baseFixture, ...testCase.override };

      // Verify
      const verdict = verifyExecutionEnvelope(
        envelope,
        MUTATIONS_EVALUATION_TIME,
        EXPECTED_POLICY_DIGEST
      );

      expect(verdict).toBe(testCase.expected_verdict);
    });

    test('corpus has 34 cases', () => {
      expect(mutationCases.length).toBe(34);
    });
  });

  describe('garbage inputs never ACCEPT', () => {
    const garbageInputs = [
      null,
      undefined,
      '',
      'string',
      123,
      [],
      {},
      { schema_version: '1' }, // missing required fields
      { ...acceptedFixture, extra_field: 'value' }, // unknown field
      { ...acceptedFixture, schema_version: 999 }, // wrong type
      { ...acceptedFixture, policy_digest: 'wrong' }, // malformed digest
      { ...acceptedFixture, policy_digest: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }, // uppercase
      { ...acceptedFixture, eligibility_decision: null }, // malformed
      { ...acceptedFixture, execution_constraints: null }, // malformed
      { ...acceptedFixture, execution_constraints: 'not-a-dict' }, // wrong type
    ];

    test.each(garbageInputs)('garbage input never gives ACCEPT: %p', (input) => {
      const verdict = verifyExecutionEnvelope(
        input,
        EVALUATION_TIME,
        EXPECTED_POLICY_DIGEST
      );
      expect(verdict).not.toBe('ACCEPT');
    });

    test('garbage inputs never throw', () => {
      for (const input of garbageInputs) {
        expect(() => {
          verifyExecutionEnvelope(input, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
        }).not.toThrow();
      }
    });
  });

  describe('constraint value validation', () => {
    test('max_latency_ms with float fraction -> REJECT_UNKNOWN', () => {
      const envelope = {
        ...acceptedFixture,
        execution_constraints: {
          ...acceptedFixture.execution_constraints,
          max_latency_ms: 5.5,
        },
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('REJECT_UNKNOWN');
    });

    test('max_latency_ms with 1.0 -> ACCEPT (1.0 is an integer)', () => {
      const envelope = {
        ...acceptedFixture,
        execution_constraints: {
          ...acceptedFixture.execution_constraints,
          max_latency_ms: 1.0,
        },
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('ACCEPT');
    });

    test('budget_usd negative -> REJECT_UNKNOWN', () => {
      const envelope = {
        ...acceptedFixture,
        execution_constraints: {
          ...acceptedFixture.execution_constraints,
          budget_usd: -1.0,
        },
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('REJECT_UNKNOWN');
    });

    test('allowed_models with empty string -> REJECT_UNKNOWN', () => {
      const envelope = {
        ...acceptedFixture,
        execution_constraints: {
          ...acceptedFixture.execution_constraints,
          allowed_models: ['gpt-4', ''],
        },
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('REJECT_UNKNOWN');
    });

    test('risk_ceiling invalid enum -> REJECT_UNKNOWN', () => {
      const envelope = {
        ...acceptedFixture,
        execution_constraints: {
          ...acceptedFixture.execution_constraints,
          risk_ceiling: 'extreme',
        },
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('REJECT_UNKNOWN');
    });

    test('unknown constraint key -> REJECT_UNKNOWN', () => {
      const envelope = {
        ...acceptedFixture,
        execution_constraints: {
          ...acceptedFixture.execution_constraints,
          max_ms: 1000, // non-canonical key
        },
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('REJECT_UNKNOWN');
    });
  });

    describe('nested field type validation', () => {
    test('task_spec.objective = 5 (number) -> REJECT_UNKNOWN', () => {
      const envelope = {
        ...acceptedFixture,
        task_spec: {
          ...acceptedFixture.task_spec,
          objective: 5, // should be a non-empty string
        },
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('REJECT_UNKNOWN');
    });

    test('verification_requirements.checks = "x" (string) -> REJECT_UNKNOWN', () => {
      const envelope = {
        ...acceptedFixture,
        verification_requirements: {
          ...acceptedFixture.verification_requirements,
          checks: 'not-an-array', // should be an array
        },
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('REJECT_UNKNOWN');
    });
  });

  describe('policy digest validation', () => {
    test('uppercase hex -> REJECT_UNKNOWN', () => {
      const envelope = {
        ...acceptedFixture,
        policy_digest: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
      expect(verdict).toBe('REJECT_UNKNOWN');
    });

    test('with sha256: prefix -> REJECT_UNKNOWN', () => {
      const envelope = {
        ...acceptedFixture,
        policy_digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('REJECT_UNKNOWN');
    });

    test('not hex chars -> REJECT_UNKNOWN', () => {
      const envelope = {
        ...acceptedFixture,
        policy_digest: 'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('REJECT_UNKNOWN');
    });

    test('too short -> REJECT_UNKNOWN', () => {
      const envelope = {
        ...acceptedFixture,
        policy_digest: 'abc',
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('REJECT_UNKNOWN');
    });

    test('well-formed but different -> DIGEST_MISMATCH', () => {
      const envelope = {
        ...acceptedFixture,
        policy_digest: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      };
      const verdict = verifyExecutionEnvelope(envelope, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      expect(verdict).toBe('DIGEST_MISMATCH');
    });
  });
});
