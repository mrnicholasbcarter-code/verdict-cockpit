import Head from 'next/head';
import React, { useState, useMemo } from 'react';
import { verifyExecutionEnvelope, type EnvelopeVerdict } from '@/lib/verifyExecutionEnvelope';
import manifest from '../../contracts/fixtures/execution-envelope/v1/manifest.json';
import acceptedFixture from '../../contracts/fixtures/execution-envelope/v1/accepted.json';
import deniedFixture from '../../contracts/fixtures/execution-envelope/v1/denied.json';
import expiredFixture from '../../contracts/fixtures/execution-envelope/v1/expired.json';
import nullDefaultsFixture from '../../contracts/fixtures/execution-envelope/v1/null-defaults.json';
import unknownFieldFixture from '../../contracts/fixtures/execution-envelope/v1/unknown-field.json';
import wrongDigestFixture from '../../contracts/fixtures/execution-envelope/v1/wrong-digest.json';

const fixtures = {
  'accepted': { name: 'accepted', data: acceptedFixture },
  'denied': { name: 'denied', data: deniedFixture },
  'expired': { name: 'expired', data: expiredFixture },
  'null-defaults': { name: 'null-defaults', data: nullDefaultsFixture },
  'unknown-field': { name: 'unknown-field', data: unknownFieldFixture },
  'wrong-digest': { name: 'wrong-digest', data: wrongDigestFixture },
};

const EVALUATION_TIME = manifest.evaluation_time;
const EXPECTED_POLICY_DIGEST = manifest.expected_policy_digest;

type VerdictStyle = {
  border: string;
  bg: string;
  text: string;
};

const verdictStyle: Record<EnvelopeVerdict, VerdictStyle> = {
  ACCEPT: { border: 'border-emerald-400/30', bg: 'bg-emerald-400/10', text: 'text-emerald-300' },
  DENY: { border: 'border-rose-400/30', bg: 'bg-rose-400/10', text: 'text-rose-300' },
  EXPIRED: { border: 'border-amber-400/30', bg: 'bg-amber-400/10', text: 'text-amber-300' },
  DIGEST_MISMATCH: { border: 'border-orange-400/30', bg: 'bg-orange-400/10', text: 'text-orange-300' },
  REJECT_UNKNOWN: { border: 'border-red-400/30', bg: 'bg-red-400/10', text: 'text-red-300' },
};

function VerdictBadge({ verdict }: { verdict: EnvelopeVerdict }) {
  const style = verdictStyle[verdict];
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${style.border} ${style.bg} ${style.text}`}
    >
      {verdict}
    </span>
  );
}

function FixtureBadge() {
  return (
    <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
      FIXTURE
    </span>
  );
}

interface FixtureRowProps {
  fixtureKey: string;
  verdict: EnvelopeVerdict;
  data: any;
  onClick: () => void;
  isSelected: boolean;
}

function FixtureRow({ fixtureKey, verdict, data, onClick, isSelected }: FixtureRowProps) {
  const eligibilityDecision = data.eligibility_decision?.decision || 
                              (data.eligibility_decision?.admitted ? 'accepted' : 'denied');
  const expiresAt = data.execution_constraints?.expires_at || 'N/A';
  const policyDigest = data.policy_digest || 'N/A';
  const shortDigest = policyDigest.length > 16 ? `${policyDigest.slice(0, 8)}...${policyDigest.slice(-8)}` : policyDigest;

  return (
    <tr
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      className={`cursor-pointer border-b border-white/5 text-slate-300 transition hover:bg-white/[0.03] focus:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-violet-400/50 ${
        isSelected ? 'bg-violet-400/10' : ''
      }`}
      role="button"
      aria-pressed={isSelected}
    >
      <td className="py-4 pr-5">
        <span className="block font-mono text-sm text-white">{fixtureKey}</span>
      </td>
      <td className="py-4 pr-5">
        <div className="flex gap-2">
          <VerdictBadge verdict={verdict} />
          <FixtureBadge />
        </div>
      </td>
      <td className="py-4 pr-5 font-mono text-xs text-slate-400" title={policyDigest}>
        {shortDigest}
      </td>
      <td className="py-4 pr-5 text-sm">{expiresAt}</td>
      <td className="py-4 text-sm">{eligibilityDecision}</td>
    </tr>
  );
}

interface DetailPanelProps {
  fixtureKey: string;
  verdict: EnvelopeVerdict;
  data: any;
}

function DetailPanel({ fixtureKey, verdict, data }: DetailPanelProps) {
  const verificationReasons: Record<EnvelopeVerdict, string> = {
    ACCEPT: 'All verification checks passed: valid schema, correct policy digest, not expired, and eligibility decision admits execution.',
    DENY: 'Eligibility decision denies execution. The admitted flag is not true, or there is a contradictory deny signal (denied=true or decision≠accept).',
    EXPIRED: 'Envelope has expired. Either expires_at is missing, unparseable, timezone-naive, or the evaluation time is >= expires_at.',
    DIGEST_MISMATCH: 'The policy_digest does not match the expected digest. This indicates the envelope was created for a different policy version.',
    REJECT_UNKNOWN: 'Schema validation failed. This could be due to unknown fields, missing required fields, wrong types, or other structural errors. v1 consumers MUST reject unknown fields.',
  };

  // Identify omitted optional fields
  const omittedFields: string[] = [];
  if (!data.routing_decision) omittedFields.push('routing_decision');
  if (!data.created_at) omittedFields.push('created_at');
  if (!data.execution_constraints?.expires_at) omittedFields.push('execution_constraints.expires_at');
  if (!data.evidence_ids || data.evidence_ids.length === 0) omittedFields.push('evidence_ids (empty)');
  if (!data.allowed_capabilities || data.allowed_capabilities.length === 0) omittedFields.push('allowed_capabilities (empty)');

  const routeIdentity = data.routing_decision?.routed_to || 'N/A';
  const createdAt = data.created_at || 'not specified';
  const expiresAt = data.execution_constraints?.expires_at || 'not specified';
  const policyDigest = data.policy_digest || 'N/A';
  const shortDigest = policyDigest.length > 16 ? `${policyDigest.slice(0, 16)}...` : policyDigest;

  return (
    <section className="glass-panel mt-5 p-5" aria-labelledby="detail-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Selected fixture</p>
          <h2 id="detail-heading" className="mt-1 text-lg font-semibold">
            {fixtureKey}.json
          </h2>
        </div>
        <VerdictBadge verdict={verdict} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <h3 className="text-sm font-semibold text-white">Provenance</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="inline font-semibold text-slate-400">Policy Digest: </dt>
            <dd className="inline font-mono text-xs text-slate-300" title={policyDigest}>{shortDigest}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-slate-400">Created At: </dt>
            <dd className="inline text-slate-300">{createdAt}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-slate-400">Expires At: </dt>
            <dd className="inline text-slate-300">{expiresAt}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-slate-400">Route Identity: </dt>
            <dd className="inline text-slate-300">{routeIdentity}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <h3 className="text-sm font-semibold text-white">Verification Status</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          <span className="font-semibold">{verdict}</span>: {verificationReasons[verdict]}
        </p>
      </div>

      {omittedFields.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <h3 className="text-sm font-semibold text-white">Omitted / Not Present</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-400">
            {omittedFields.map((field) => (
              <li key={field} className="font-mono text-xs">{field}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-white">Full Envelope JSON</h3>
        <pre className="mt-2 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900 p-4 text-xs text-slate-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </section>
  );
}

type SortDirection = 'asc' | 'desc';

interface FilterState {
  decision: 'all' | EnvelopeVerdict;
  route: string;
  reason: string;
  timestampSort: SortDirection | null;
  hasEvidence: 'all' | 'yes' | 'no';
  hasClaim: 'all' | 'yes' | 'no';
}

export default function ExecutionEnvelopes() {
  const [selectedFixture, setSelectedFixture] = useState<string | null>('accepted');
  const [filters, setFilters] = useState<FilterState>({
    decision: 'all',
    route: '',
    reason: '',
    timestampSort: null,
    hasEvidence: 'all',
    hasClaim: 'all',
  });

  const fixtureResults = useMemo(() => 
    Object.entries(fixtures).map(([key, { name, data }]) => {
      const verdict = verifyExecutionEnvelope(data, EVALUATION_TIME, EXPECTED_POLICY_DIGEST);
      return { key, name, data, verdict };
    }),
    []
  );

  const filteredAndSortedResults = useMemo(() => {
    let results = [...fixtureResults];

    // Filter by decision
    if (filters.decision !== 'all') {
      results = results.filter(r => r.verdict === filters.decision);
    }

    // Filter by route
    if (filters.route) {
      const routeFilter = filters.route.toLowerCase();
      results = results.filter(r => {
        const route = r.data.routing_decision?.routed_to || '';
        return route.toLowerCase().includes(routeFilter);
      });
    }

    // Filter by reason (searches in verdict name or eligibility decision)
    if (filters.reason) {
      const reasonFilter = filters.reason.toLowerCase();
      results = results.filter(r => {
        const verdict = r.verdict.toLowerCase();
        const eligibilityReason = (r.data.eligibility_decision as any)?.reason || '';
        return verdict.includes(reasonFilter) || eligibilityReason.toLowerCase().includes(reasonFilter);
      });
    }

    // Filter by evidence presence
    if (filters.hasEvidence === 'yes') {
      results = results.filter(r => r.data.evidence_ids && r.data.evidence_ids.length > 0);
    } else if (filters.hasEvidence === 'no') {
      results = results.filter(r => !r.data.evidence_ids || r.data.evidence_ids.length === 0);
    }

    // Filter by claim (allowed_capabilities) presence
    if (filters.hasClaim === 'yes') {
      results = results.filter(r => r.data.allowed_capabilities && r.data.allowed_capabilities.length > 0);
    } else if (filters.hasClaim === 'no') {
      results = results.filter(r => !r.data.allowed_capabilities || r.data.allowed_capabilities.length === 0);
    }

    // Sort by timestamp
    if (filters.timestampSort) {
      results.sort((a, b) => {
        const timeA = a.data.created_at || '';
        const timeB = b.data.created_at || '';
        if (filters.timestampSort === 'asc') {
          return timeA.localeCompare(timeB);
        } else {
          return timeB.localeCompare(timeA);
        }
      });
    }

    return results;
  }, [fixtureResults, filters]);

  const selectedResult = filteredAndSortedResults.find((r) => r.key === selectedFixture) || 
                         fixtureResults.find((r) => r.key === selectedFixture);

  return (
    <>
      <Head>
        <title>Execution Envelopes | Verdict Cockpit</title>
        <meta
          name="description"
          content="Read-only explorer for ExecutionEnvelope v1 canonical fixtures from verdict-core."
        />
      </Head>

      <main className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
                Verdict Cockpit
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Execution Envelopes
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                Read-only explorer for ExecutionEnvelope v1 canonical fixtures from verdict-core @{' '}
                <code className="font-mono text-xs">80ebaf2</code>
              </p>
            </div>
            <div
              className="rounded-2xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-sm text-blue-200"
              role="status"
            >
              <span className="font-semibold">Canonical fixtures</span>
              <span className="block text-xs text-blue-200/75">6 test envelopes</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-5 px-5 py-6">
          {/* Filter controls */}
          <section className="glass-panel p-5" aria-labelledby="filters-heading">
            <h2 id="filters-heading" className="text-sm font-semibold text-white">Filters</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="filter-decision" className="block text-xs font-semibold text-slate-400">
                  Decision
                </label>
                <select
                  id="filter-decision"
                  value={filters.decision}
                  onChange={(e) => setFilters({ ...filters, decision: e.target.value as FilterState['decision'] })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  aria-label="Filter by decision verdict"
                >
                  <option value="all">All verdicts</option>
                  <option value="ACCEPT">ACCEPT</option>
                  <option value="DENY">DENY</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="DIGEST_MISMATCH">DIGEST_MISMATCH</option>
                  <option value="REJECT_UNKNOWN">REJECT_UNKNOWN</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter-route" className="block text-xs font-semibold text-slate-400">
                  Route
                </label>
                <input
                  id="filter-route"
                  type="text"
                  value={filters.route}
                  onChange={(e) => setFilters({ ...filters, route: e.target.value })}
                  placeholder="Filter by route..."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  aria-label="Filter by route identity"
                />
              </div>

              <div>
                <label htmlFor="filter-reason" className="block text-xs font-semibold text-slate-400">
                  Reason
                </label>
                <input
                  id="filter-reason"
                  type="text"
                  value={filters.reason}
                  onChange={(e) => setFilters({ ...filters, reason: e.target.value })}
                  placeholder="Filter by reason..."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  aria-label="Filter by rejection or denial reason"
                />
              </div>

              <div>
                <label htmlFor="filter-timestamp" className="block text-xs font-semibold text-slate-400">
                  Timestamp Sort
                </label>
                <select
                  id="filter-timestamp"
                  value={filters.timestampSort || ''}
                  onChange={(e) => setFilters({ ...filters, timestampSort: e.target.value ? e.target.value as SortDirection : null })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  aria-label="Sort by timestamp"
                >
                  <option value="">No sort</option>
                  <option value="asc">Oldest first</option>
                  <option value="desc">Newest first</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter-evidence" className="block text-xs font-semibold text-slate-400">
                  Evidence Status
                </label>
                <select
                  id="filter-evidence"
                  value={filters.hasEvidence}
                  onChange={(e) => setFilters({ ...filters, hasEvidence: e.target.value as FilterState['hasEvidence'] })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  aria-label="Filter by evidence presence"
                >
                  <option value="all">All</option>
                  <option value="yes">Has evidence</option>
                  <option value="no">No evidence</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter-claim" className="block text-xs font-semibold text-slate-400">
                  Claim Status
                </label>
                <select
                  id="filter-claim"
                  value={filters.hasClaim}
                  onChange={(e) => setFilters({ ...filters, hasClaim: e.target.value as FilterState['hasClaim'] })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  aria-label="Filter by claim (allowed capabilities) presence"
                >
                  <option value="all">All</option>
                  <option value="yes">Has claims</option>
                  <option value="no">No claims</option>
                </select>
              </div>
            </div>
          </section>

          <section className="glass-panel p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Contract verification
              </p>
              <h2 className="mt-1 text-lg font-semibold">Fixture Table</h2>
              <p className="mt-2 text-sm text-slate-400">
                {filteredAndSortedResults.length === 0 
                  ? 'No fixtures match the current filters.'
                  : `Showing ${filteredAndSortedResults.length} of ${fixtureResults.length} fixture(s). Click a row to view details.`}
              </p>
            </div>

            {filteredAndSortedResults.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-center" role="status">
                <p className="text-sm text-slate-400">No fixtures match the current filters.</p>
                <button
                  onClick={() => setFilters({
                    decision: 'all',
                    route: '',
                    reason: '',
                    timestampSort: null,
                    hasEvidence: 'all',
                    hasClaim: 'all',
                  })}
                  className="mt-3 rounded-lg border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-sm font-semibold text-violet-300 transition hover:bg-violet-400/20 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm" role="table" aria-label="Execution envelopes fixture table">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="pb-3 pr-5" scope="col">Fixture</th>
                      <th className="pb-3 pr-5" scope="col">Verdict</th>
                      <th className="pb-3 pr-5" scope="col">Policy Digest</th>
                      <th className="pb-3 pr-5" scope="col">Expires At</th>
                      <th className="pb-3" scope="col">Eligibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedResults.map((result) => (
                      <FixtureRow
                        key={result.key}
                        fixtureKey={result.key}
                        verdict={result.verdict}
                        data={result.data}
                        onClick={() => setSelectedFixture(result.key)}
                        isSelected={selectedFixture === result.key}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {selectedResult && (
            <DetailPanel
              fixtureKey={selectedResult.key}
              verdict={selectedResult.verdict}
              data={selectedResult.data}
            />
          )}

          <footer className="pb-4 text-center text-xs text-slate-600">
            Fixtures are vendored from verdict-core @ 80ebaf23278473bb48bde807c1c3867e980a6e14. Never
            presented as live evidence.
          </footer>
        </div>
      </main>
    </>
  );
}
