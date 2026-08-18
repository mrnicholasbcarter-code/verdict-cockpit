import Head from 'next/head';
import {
  formatDuration,
  formatUsd,
  routeObservations,
  routeRecommendation,
} from '@/lib/routeLabStore';
import { useCurrentReport, useReportSelection, useRouteLab } from '@/hooks/useRouteLab';

type Status = 'accepted' | 'denied' | 'unknown' | 'passed' | 'failed';

const statusStyle: Record<Status, string> = {
  accepted: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  passed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  denied: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  failed: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  unknown: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
};

function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusStyle[status]}`}>
      {status}
    </span>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="metric-card min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 truncate text-2xl font-semibold text-white" title={value}>{value}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-white/10 bg-slate-950/90">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">Verdict Cockpit</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">AutoDev Route Lab</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">Acceptance evidence for an exact patch, source state, and route served.</p>
        </div>
        <div className="rounded-2xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-sm text-blue-200" role="status">
          <span className="font-semibold">Deterministic fixture</span>
          <span className="block text-xs text-blue-200/75">No live API calls</span>
        </div>
      </div>
    </header>
  );
}

function ReportSelector() {
  const { reports, currentReportId, selectReport } = useReportSelection();
  return (
    <div className="flex flex-wrap gap-2" aria-label="Fixture reports">
      {reports.map((report) => (
        <button
          key={report.reportId}
          type="button"
          onClick={() => selectReport(report.reportId)}
          className={`rounded-xl border px-4 py-2 text-left text-sm transition ${report.reportId === currentReportId ? 'border-violet-400/50 bg-violet-400/15 text-white' : 'border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/20 hover:text-white'}`}
        >
          <span className="block font-medium">{`${report.acceptance[0].toUpperCase()}${report.acceptance.slice(1)} candidate`}</span>
          <span className="block font-mono text-xs opacity-70">{report.source.patchCommit}</span>
        </button>
      ))}
    </div>
  );
}

function SourceBinding() {
  const report = useCurrentReport();
  if (!report) return null;
  return (
    <section className="glass-panel p-5" aria-labelledby="source-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Immutable input</p>
          <h2 id="source-heading" className="mt-1 text-lg font-semibold">Source-state binding</h2>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{report.source.treeState}</span>
      </div>
      <dl className="mt-5 space-y-4 text-sm">
        {[
          ['Repository', report.source.repository],
          ['Base commit', report.source.baseCommit],
          ['Patch commit', report.source.patchCommit],
          ['Patch digest', report.source.patchDigest],
        ].map(([label, value]) => (
          <div key={label} className="grid gap-1 sm:grid-cols-[110px_minmax(0,1fr)]">
            <dt className="text-slate-500">{label}</dt>
            <dd className="break-all font-mono text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Changed files</p>
        <ul className="mt-2 space-y-1 font-mono text-xs text-slate-300">
          {report.changedFiles.map((file) => <li key={file}>{file}</li>)}
        </ul>
      </div>
    </section>
  );
}

function RouteEvidence() {
  const report = useCurrentReport();
  if (!report) return null;
  return (
    <section className="glass-panel p-5" aria-labelledby="route-heading">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Observed execution</p>
      <h2 id="route-heading" className="mt-1 text-lg font-semibold">Route used</h2>
      <div className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-4">
        <p className="text-sm font-semibold text-violet-200">Served by OmniRoute</p>
        <p className="mt-2 break-all font-mono text-lg text-white">{report.route.requested_alias}</p>
        <p className="mt-1 text-sm text-slate-400">{report.route.provider} / {report.route.model_id}</p>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-slate-500">Protocol</dt><dd className="mt-1 text-slate-200">{report.route.protocol}</dd></div>
        <div><dt className="text-slate-500">Endpoint</dt><dd className="mt-1 text-slate-200">{report.route.endpoint}</dd></div>
        <div><dt className="text-slate-500">Request ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-200">{report.outcome.request_id}</dd></div>
        <div><dt className="text-slate-500">Policy floor</dt><dd className="mt-1 text-slate-200">{report.routingDecision.policy_floor}</dd></div>
      </dl>
      <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">Route identity records what OmniRoute served. Verdict did not select or score this provider or model.</p>
    </section>
  );
}

function EvidenceChecks() {
  const report = useCurrentReport();
  if (!report) return null;
  return (
    <section className="glass-panel p-5 xl:col-span-3" aria-labelledby="checks-heading">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Independent receipts</p>
        <h2 id="checks-heading" className="mt-1 text-lg font-semibold">Acceptance evidence</h2>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {report.checks.map((check) => (
          <article key={check.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-medium text-white">{check.label}</h3><p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">Authority: {check.authority}</p></div>
              <StatusPill status={check.status} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{check.detail}</p>
            <p className="mt-3 break-all font-mono text-xs text-slate-500">{check.evidenceDigest}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecommendationPanel() {
  return (
    <section className="glass-panel p-5" aria-labelledby="recommendation-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Route lifecycle</p><h2 id="recommendation-heading" className="mt-1 text-lg font-semibold">Candidate recommendation</h2></div>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">Advisory only</span>
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <p className="font-mono text-lg text-white">{routeRecommendation.recommendedRoute}</p>
        <p className="mt-1 text-sm text-slate-400">Proposed stage: {routeRecommendation.targetStage}</p>
        <p className="mt-3 text-sm leading-6 text-slate-300">{routeRecommendation.rationale}</p>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">A recommendation cannot authorize a mutation or self-promote a route. Promotion requires separately governed evidence and policy.</p>
    </section>
  );
}

function RouteObservations() {
  return (
    <section className="glass-panel min-w-0 p-5 xl:col-span-3" aria-labelledby="observations-heading">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fixture cohort</p>
      <h2 id="observations-heading" className="mt-1 text-lg font-semibold">Counterfactual route observations</h2>
      <p className="mt-2 text-sm text-slate-400">Comparison evidence informs the advisory recommendation; it never authorizes this patch.</p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="pb-3 pr-5">Route served</th><th className="pb-3 pr-5">Verified</th><th className="pb-3 pr-5">Accepted</th><th className="pb-3 pr-5">Median cost</th><th className="pb-3 pr-5">Median latency</th><th className="pb-3">Limitations</th></tr></thead>
          <tbody>
            {routeObservations.map((item) => (
              <tr key={item.route} className="border-b border-white/5 text-slate-300">
                <td className="py-4 pr-5"><span className="font-mono text-white">{item.route}</span><span className="mt-1 block text-xs text-slate-500">via {item.gateway}; {item.confidence} confidence</span></td>
                <td className="py-4 pr-5 tabular-nums">{item.verifiedRuns}</td><td className="py-4 pr-5 tabular-nums">{item.acceptedRuns}</td><td className="py-4 pr-5 tabular-nums">{formatUsd(item.medianCostUsd)}</td><td className="py-4 pr-5 tabular-nums">{formatDuration(item.medianLatencyMs)}</td><td className="py-4 text-xs text-slate-400">{item.limitations.join('; ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Home() {
  const report = useCurrentReport();
  const loadError = useRouteLab((state) => state.loadError);
  if (!report) return <main className="min-h-screen bg-slate-950 p-8 text-white">No report available.</main>;
  return (
    <>
      <Head><title>Verdict AutoDev Route Lab</title><meta name="description" content="Read-only acceptance evidence for source-bound autonomous development changes." /></Head>
      <main className="min-h-screen bg-slate-950 text-white">
        <Header />
        <div className="mx-auto max-w-[1500px] space-y-5 px-5 py-6">
          <section className="glass-panel p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div><div className="flex flex-wrap items-center gap-3"><StatusPill status={report.acceptance} /><span className="font-mono text-xs text-slate-500">{report.reportId}</span></div><h2 className="mt-3 max-w-3xl text-xl font-semibold">{report.objective}</h2><p className="mt-2 text-sm text-slate-400">Verdict evaluated independent evidence; the worker&apos;s self-report was not sufficient.</p></div>
              <ReportSelector />
            </div>
            {loadError && <p className="mt-4 text-sm text-rose-300" role="alert">{loadError}</p>}
          </section>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Report summary">
            <Metric label="Acceptance" value={report.acceptance} detail="Deterministic Verdict outcome" />
            <Metric label="Source patch" value={report.source.patchCommit} detail={`Bound to base ${report.source.baseCommit}`} />
            <Metric label="Route served" value={report.route.requested_alias} detail="Observed from OmniRoute" />
            <Metric label="Independent checks" value={`${report.checks.filter((check) => check.status === 'passed').length}/${report.checks.length}`} detail={`${report.checks.filter((check) => check.status === 'failed').length} failed; ${report.checks.filter((check) => check.status === 'unknown').length} unresolved`} />
          </section>
          <div className="grid gap-5 xl:grid-cols-3"><SourceBinding /><RouteEvidence /><RecommendationPanel /></div>
          <div className="grid gap-5 xl:grid-cols-3"><EvidenceChecks /><RouteObservations /></div>
          <footer className="pb-4 text-center text-xs text-slate-600">Fixture IDs, commits, evidence digests, checks, route observations, costs, and latencies are illustrative deterministic data—not live run records.</footer>
        </div>
      </main>
    </>
  );
}
