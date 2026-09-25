import type { OutcomeEvent, RoutingDecision } from '@bodanglin/verdict-contracts';
import { z } from 'zod';
import { create } from 'zustand';

const checkSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  authority: z.enum(['git', 'ci', 'verdict']),
  status: z.enum(['passed', 'failed', 'unknown']),
  evidenceDigest: z.string().min(1),
  detail: z.string().min(1),
}).strict();

const routeSchema = z.object({
  gateway: z.literal('OmniRoute'),
  provider: z.string().min(1),
  model_id: z.string().min(1),
  requested_alias: z.string().min(1),
  endpoint: z.string().min(1),
  protocol: z.string().min(1),
}).strict();

export const trustedChangeReportSchema = z.object({
  schemaVersion: z.literal('1'),
  reportId: z.string().min(1),
  objective: z.string().min(1),
  taskCategory: z.string().min(1),
  acceptance: z.enum(['accepted', 'denied', 'unknown']),
  evaluatedAt: z.string().datetime(),
  source: z.object({
    repository: z.string().min(1),
    baseCommit: z.string().regex(/^[0-9a-f]{7,64}$/),
    patchCommit: z.string().regex(/^[0-9a-f]{7,64}$/),
    treeState: z.enum(['clean', 'dirty-snapshot']),
    patchDigest: z.string().min(1),
  }).strict(),
  route: routeSchema,
  routingDecision: z.object({
    schema_version: z.literal('1'),
    selected_route: z.record(z.unknown()),
    task_spec: z.record(z.unknown()),
    candidate_snapshot: z.union([z.string(), z.record(z.unknown()), z.null()]),
    exclusions: z.array(z.record(z.unknown())),
    policy_floor: z.enum(['none', 'isolated', 'protected', 'standard', 'best_effort', 'medium', 'high']),
    planner_mode: z.string(),
    explanation: z.string(),
    adaptive_influence: z.record(z.unknown()),
    fallback_plan: z.array(z.object({
      id: z.string().optional(),
      action: z.enum(['answer', 'research', 'implement', 'review', 'verify', 'synthesis', 'specialist', 'human_approval', 'execute']),
      objective: z.string().optional(),
      parallel: z.boolean().optional(),
      required: z.boolean().optional(),
      verification: z.string().optional(),
    }).strict()),
    correlation_id: z.string().nullable(),
    request_id: z.string().nullable(),
    policy_version: z.string(),
  }).strict(),
  outcome: z.object({
    schema_version: z.literal('1'),
    event_id: z.string().nullable(),
    event_type: z.string(),
    correlation_id: z.string().nullable(),
    outcome: z.enum(['success', 'failure', 'partial', 'denied', 'unknown', 'cancelled', 'timeout', 'error', 'skipped']),
    occurred_at: z.string().datetime(),
    request_id: z.string().nullable(),
    verification: z.record(z.unknown()),
    quality: z.record(z.unknown()),
    latency_ms: z.number().nullable(),
    cost: z.record(z.unknown()),
    retries: z.number(),
    fallbacks: z.array(z.unknown()),
    provider_version: z.string().nullable(),
    model_version: z.string().nullable(),
    details: z.record(z.unknown()).nullable(),
  }).strict(),
  checks: z.array(checkSchema).min(1),
  changedFiles: z.array(z.string().min(1)),
  ownershipBoundary: z.enum(['held', 'violated', 'unknown']),
}).strict();

export type TrustedChangeReport = z.infer<typeof trustedChangeReportSchema> & {
  routingDecision: RoutingDecision;
  outcome: OutcomeEvent;
};

export interface RouteObservation {
  route: string;
  gateway: 'OmniRoute';
  verifiedRuns: number;
  acceptedRuns: number;
  medianCostUsd: number;
  medianLatencyMs: number;
  confidence: 'low' | 'medium' | 'high';
  limitations: string[];
}

export interface RouteRecommendation {
  taskCategory: string;
  recommendedRoute: string;
  targetStage: 'shadow' | 'candidate' | 'canary';
  rationale: string;
  authority: 'advisory-only';
}

const fixtureReports: TrustedChangeReport[] = [
  {
    schemaVersion: '1', reportId: 'tcr-authz-accepted',
    objective: 'Fix authorization regression without changing protected policy files',
    taskCategory: 'authorization-bugfix', acceptance: 'accepted',
    evaluatedAt: '2026-08-15T14:32:10.000Z',
    source: { repository: 'demo/authz-service', baseCommit: '7ba921c', patchCommit: 'c91e8ab', treeState: 'clean', patchDigest: 'sha256:8fd52f1d' },
    route: { gateway: 'OmniRoute', provider: 'openai', model_id: 'gpt-5.4-mini', requested_alias: 'cx/gpt-5.4-mini', endpoint: 'responses', protocol: 'openai-responses' },
    routingDecision: { schema_version: '1', selected_route: { gateway: 'OmniRoute', model_id: 'gpt-5.4-mini' }, task_spec: { category: 'authorization-bugfix' }, candidate_snapshot: 'snapshot-1441', exclusions: [], policy_floor: 'protected', planner_mode: 'deterministic', explanation: 'Eligible route supplied by OmniRoute; Verdict applied the protected-effect floor.', adaptive_influence: {}, fallback_plan: [], correlation_id: 'corr-authz-01', request_id: 'req-authz-01', policy_version: 'autodev-v1', decision_id: 'decision-authz-01', receipt: { digest: 'sha256:abc', signed_at: '2024-01-01T00:00:00Z' } } as any,
    outcome: { schema_version: '1', event_id: 'outcome-authz-01', event_type: 'change.acceptance', correlation_id: 'corr-authz-01', outcome: 'success', occurred_at: '2026-08-15T14:32:10.000Z', request_id: 'req-authz-01', verification: { independent: true }, quality: { acceptance: 1 }, latency_ms: 48210, cost: { usd: 0.18 }, retries: 0, fallbacks: [], provider_version: null, model_version: 'gpt-5.4-mini', details: { acceptance: 'accepted' } },
    checks: [
      { id: 'boundary', label: 'Owned-path boundary', authority: 'verdict', status: 'passed', evidenceDigest: 'sha256:a415bc', detail: '2 changed files; all inside src/auth/**' },
      { id: 'focused', label: 'Focused authorization tests', authority: 'ci', status: 'passed', evidenceDigest: 'sha256:8913a0', detail: '18 passed, exit 0' },
      { id: 'regression', label: 'Independent regression suite', authority: 'ci', status: 'passed', evidenceDigest: 'sha256:60dd13', detail: '147 passed, exit 0' },
      { id: 'binding', label: 'Source and patch binding', authority: 'git', status: 'passed', evidenceDigest: 'sha256:8fd52f', detail: 'Evidence matches base, patch, and clean tree' },
    ],
    changedFiles: ['src/auth/authorize.ts', 'tests/auth/authorize.test.ts'], ownershipBoundary: 'held',
  },
  {
    schemaVersion: '1', reportId: 'tcr-authz-denied',
    objective: 'Fix authorization regression without changing protected policy files',
    taskCategory: 'authorization-bugfix', acceptance: 'denied',
    evaluatedAt: '2026-08-15T14:20:03.000Z',
    source: { repository: 'demo/authz-service', baseCommit: '7ba921c', patchCommit: 'b71a4de', treeState: 'clean', patchDigest: 'sha256:1be2972a' },
    route: { gateway: 'OmniRoute', provider: 'anthropic', model_id: 'claude-sonnet-5', requested_alias: 'auto/coding', endpoint: 'messages', protocol: 'anthropic-messages' },
    routingDecision: { schema_version: '1', selected_route: { gateway: 'OmniRoute', model_id: 'claude-sonnet-5' }, task_spec: { category: 'authorization-bugfix' }, candidate_snapshot: 'snapshot-1430', exclusions: [], policy_floor: 'protected', planner_mode: 'deterministic', explanation: 'Route identity recorded from OmniRoute; acceptance remains independent.', adaptive_influence: {}, fallback_plan: [], correlation_id: 'corr-authz-00', request_id: 'req-authz-00', policy_version: 'autodev-v1', decision_id: 'decision-authz-00', receipt: { digest: 'sha256:def', signed_at: '2024-01-01T00:00:00Z' } } as any,
    outcome: { schema_version: '1', event_id: 'outcome-authz-00', event_type: 'change.acceptance', correlation_id: 'corr-authz-00', outcome: 'denied', occurred_at: '2026-08-15T14:20:03.000Z', request_id: 'req-authz-00', verification: { independent: true }, quality: {}, latency_ms: 51750, cost: { usd: 0.31 }, retries: 0, fallbacks: [], provider_version: null, model_version: 'claude-sonnet-5', details: { acceptance: 'denied' } },
    checks: [
      { id: 'boundary', label: 'Owned-path boundary', authority: 'verdict', status: 'failed', evidenceDigest: 'sha256:792ccb', detail: 'Protected config/policy.ts was modified' },
      { id: 'focused', label: 'Focused authorization tests', authority: 'ci', status: 'passed', evidenceDigest: 'sha256:124cd1', detail: '18 passed, exit 0; passing tests cannot override boundary denial' },
    ],
    changedFiles: ['src/auth/authorize.ts', 'config/policy.ts'], ownershipBoundary: 'violated',
  },
  {
    schemaVersion: '1', reportId: 'tcr-authz-unknown',
    objective: 'Evaluate a patch whose independent regression receipt became stale',
    taskCategory: 'authorization-bugfix', acceptance: 'unknown',
    evaluatedAt: '2026-08-15T15:05:44.000Z',
    source: { repository: 'demo/authz-service', baseCommit: '7ba921c', patchCommit: 'd42f6a9', treeState: 'clean', patchDigest: 'sha256:de481f09' },
    route: { gateway: 'OmniRoute', provider: 'google', model_id: 'gemini-2.5-pro', requested_alias: 'auto/coding', endpoint: 'generateContent', protocol: 'google-generative-language' },
    routingDecision: { schema_version: '1', selected_route: { gateway: 'OmniRoute', model_id: 'gemini-2.5-pro' }, task_spec: { category: 'authorization-bugfix' }, candidate_snapshot: 'snapshot-1452', exclusions: [], policy_floor: 'protected', planner_mode: 'deterministic', explanation: 'Route identity recorded from OmniRoute; stale acceptance evidence prevents authorization.', adaptive_influence: {}, fallback_plan: [], correlation_id: 'corr-authz-02', request_id: 'req-authz-02', policy_version: 'autodev-v1', decision_id: 'decision-authz-02', receipt: { digest: 'sha256:ghi', signed_at: '2024-01-01T00:00:00Z' } } as any,
    outcome: { schema_version: '1', event_id: 'outcome-authz-02', event_type: 'change.acceptance', correlation_id: 'corr-authz-02', outcome: 'unknown', occurred_at: '2026-08-15T15:05:44.000Z', request_id: 'req-authz-02', verification: { independent: true }, quality: {}, latency_ms: 56320, cost: { usd: 0.24 }, retries: 1, fallbacks: [], provider_version: null, model_version: 'gemini-2.5-pro', details: { acceptance: 'unknown' } },
    checks: [
      { id: 'boundary', label: 'Owned-path boundary', authority: 'verdict', status: 'passed', evidenceDigest: 'sha256:358ab2', detail: '1 changed file; inside src/auth/**' },
      { id: 'focused', label: 'Focused authorization tests', authority: 'ci', status: 'passed', evidenceDigest: 'sha256:38dc12', detail: '18 passed, exit 0' },
      { id: 'regression', label: 'Independent regression suite', authority: 'ci', status: 'unknown', evidenceDigest: 'sha256:stale-24h', detail: 'Receipt exceeded the 24-hour freshness window; acceptance remains unknown' },
      { id: 'binding', label: 'Source and patch binding', authority: 'git', status: 'passed', evidenceDigest: 'sha256:54cf29', detail: 'Evidence matches base, patch, and clean tree' },
    ],
    changedFiles: ['src/auth/authorize.ts'], ownershipBoundary: 'held',
  },
];

export const routeObservations: RouteObservation[] = [
  { route: 'cx/gpt-5.4-mini', gateway: 'OmniRoute', verifiedRuns: 14, acceptedRuns: 12, medianCostUsd: 0.18, medianLatencyMs: 48210, confidence: 'medium', limitations: ['Fixture cohort', 'One repository family'] },
  { route: 'auto/coding', gateway: 'OmniRoute', verifiedRuns: 11, acceptedRuns: 8, medianCostUsd: 0.31, medianLatencyMs: 51750, confidence: 'medium', limitations: ['Fixture cohort', 'Actual model identity varied'] },
];

export const routeRecommendation: RouteRecommendation = {
  taskCategory: 'authorization-bugfix', recommendedRoute: 'cx/gpt-5.4-mini', targetStage: 'candidate',
  rationale: 'Higher verified acceptance with lower observed median cost in this fixture cohort.', authority: 'advisory-only',
};

interface RouteLabState {
  reports: TrustedChangeReport[];
  currentReportId: string;
  loadError: string | null;
  selectReport: (reportId: string) => void;
  loadReport: (input: unknown) => boolean;
}

export const useRouteLabStore = create<RouteLabState>((set, get) => ({
  reports: fixtureReports,
  currentReportId: fixtureReports[0].reportId,
  loadError: null,
  selectReport: (reportId) => {
    if (!get().reports.some((report) => report.reportId === reportId)) {
      set({ loadError: `Unknown report: ${reportId}` });
      return;
    }
    set({ currentReportId: reportId, loadError: null });
  },
  loadReport: (input) => {
    const parsed = trustedChangeReportSchema.safeParse(input);
    if (!parsed.success) {
      set({ loadError: 'Report rejected: malformed or unsupported contract.', });
      return false;
    }
    const report = parsed.data as TrustedChangeReport;
    set((state) => ({ reports: [report, ...state.reports.filter((item) => item.reportId !== report.reportId)], currentReportId: report.reportId, loadError: null }));
    return true;
  },
}));

export const selectCurrentReport = (state: RouteLabState) =>
  state.reports.find((report) => report.reportId === state.currentReportId) ?? null;

export const formatUsd = (value: number) => `$${value.toFixed(2)}`;
export const formatDuration = (value: number) => `${(value / 1000).toFixed(1)}s`;
