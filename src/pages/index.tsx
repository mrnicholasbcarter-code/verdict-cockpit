import Head from 'next/head';
import { useEffect } from 'react';
import {
  useRoutingStore,
  formatCost,
  formatLatency,
  ProviderHealth,
  ModelCandidate,
} from '@/lib/routingStore';

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Metric({
  label,
  value,
  accent,
  subtext,
}: {
  label: string;
  value: string;
  accent?: 'green' | 'red' | 'violet' | 'amber' | 'blue';
  subtext?: string;
}) {
  const accentClass = {
    green: 'text-green-400',
    red: 'text-red-500',
    violet: 'text-violet-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
  }[accent ?? 'green'];

  return (
    <div className="metric-card">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className={classNames('mt-3 text-2xl font-semibold tabular-nums', accentClass)}>{value}</div>
      {subtext ? <div className="mt-1 text-xs text-slate-500">{subtext}</div> : null}
    </div>
  );
}

const statusDot: Record<ProviderHealth['status'], string> = {
  healthy: 'bg-green-400',
  degraded: 'bg-amber-400',
  down: 'bg-red-500',
};

const statusText: Record<ProviderHealth['status'], string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
};

function Header() {
  const policyGate = useRoutingStore((s) => s.policyGate);
  const setPolicyGate = useRoutingStore((s) => s.setPolicyGate);
  const isEvaluating = useRoutingStore((s) => s.isEvaluating);
  const simulateEvaluation = useRoutingStore((s) => s.simulateEvaluation);
  const lastUpdate = useRoutingStore((s) => s.lastUpdate);

  return (
    <header className="flex flex-col gap-5 border-b border-white/10 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-500/30 bg-violet-500/10 shadow-glow">
            <span className="text-xl font-black text-violet-400">V</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Verdict AI Routing Cockpit</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Policy-Gated Model Router</h1>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400" title="Dashboard uses bundled fixtures, no live API calls">
          Demo Data
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-300">
          Policy gate{' '}
          <span className="font-semibold text-violet-400">{policyGate}</span>
        </div>
        <select
          aria-label="Select policy gate"
          value={policyGate}
          onChange={(e) => setPolicyGate(e.target.value as any)}
          className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white outline-none"
        >
          <option value="cost-aware">cost-aware</option>
          <option value="latency-first">latency-first</option>
          <option value="quality-first">quality-first</option>
          <option value="balanced">balanced</option>
        </select>
        <button
          onClick={simulateEvaluation}
          disabled={isEvaluating}
          className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
        >
          {isEvaluating ? 'Evaluating…' : 'Re-run decision'}
        </button>
        <div className="text-xs text-slate-500">Updated {new Date(lastUpdate).toLocaleTimeString()}</div>
      </div>
    </header>
  );
}

function ProviderHealthPanel() {
  const providers = useRoutingStore((s) => s.providers);
  return (
    <section className="glass-panel p-5">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Provider telemetry</p>
        <h2 className="text-lg font-semibold text-white">Provider health &amp; freshness</h2>
      </div>
      <div className="space-y-3">
        {providers.map((p) => (
          <div key={p.name} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={classNames('h-2.5 w-2.5 rounded-full', statusDot[p.status])} />
                <span className="font-semibold text-white">{p.name}</span>
              </div>
              <span className={classNames('text-xs font-medium', p.status === 'healthy' ? 'text-green-400' : p.status === 'degraded' ? 'text-amber-400' : 'text-red-500')}>
                {statusText[p.status]}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-slate-400">
              <div>Latency <span className="font-semibold text-white tabular-nums">{p.latencyMs}ms</span></div>
              <div>Success <span className="font-semibold text-white tabular-nums">{p.successRate.toFixed(1)}%</span></div>
              <div>Fresh <span className="font-semibold text-white tabular-nums">{new Date(p.lastCheck).toLocaleTimeString()}</span></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CandidateRow({ candidate, highlight }: { candidate: ModelCandidate; highlight?: 'selected' | 'fallback' }) {
  const accent =
    highlight === 'selected'
      ? 'border-green-500/40 bg-green-500/[0.08] shadow-glow'
      : highlight === 'fallback'
      ? 'border-blue-500/30 bg-blue-500/[0.06]'
      : 'border-white/10 bg-white/[0.035]';
  return (
    <div className={classNames('rounded-2xl border p-4 transition', accent)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span>{candidate.provider}</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>{candidate.status}</span>
          </div>
          <h3 className="mt-2 font-semibold text-white">{candidate.name}</h3>
        </div>
        <div className="flex flex-col items-end text-right text-sm">
          <span className="text-slate-500">Cost</span>
          <span className="font-semibold text-white tabular-nums">{formatCost(candidate.costPer1kTokens)}/1k</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div><p className="text-slate-500">P50</p><p className="font-semibold text-white tabular-nums">{formatLatency(candidate.latencyP50Ms)}</p></div>
        <div><p className="text-slate-500">P99</p><p className="font-semibold text-white tabular-nums">{formatLatency(candidate.latencyP99Ms)}</p></div>
        <div><p className="text-slate-500">Capability</p><p className="font-semibold text-white tabular-nums">{candidate.capabilityScore}</p></div>
      </div>
      {candidate.reason ? (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300">
          {candidate.reason}
        </div>
      ) : null}
    </div>
  );
}

function DecisionPanel() {
  const decision = useRoutingStore((s) => s.currentDecision);
  if (!decision) return null;
  return (
    <section className="glass-panel relative overflow-hidden p-6 lg:col-span-2">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
      <p className="text-xs uppercase tracking-[0.3em] text-violet-400">Selected routing decision</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">{decision.selectedModel.name}</h2>
      <p className="mt-2 text-sm text-slate-400">
        Policy gate <span className="font-semibold text-violet-300">{decision.policyGate}</span> routed task{' '}
        <span className="font-mono text-slate-300">{decision.taskType}</span> to {decision.selectedModel.provider}.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Estimated cost" value={formatCost(decision.estimatedCost)} accent="green" subtext="per 1k tokens est." />
        <Metric label="Expected latency" value={formatLatency(decision.estimatedLatencyMs)} accent="violet" subtext="P50" />
        <Metric label="Rejected" value={`${decision.rejectedCandidates.length}`} accent="amber" subtext="candidates" />
        <Metric label="Fallback" value={decision.fallbackModel ? decision.fallbackModel.name : 'none'} accent="blue" subtext="on provider fail" />
      </div>
    </section>
  );
}

function RejectedPanel() {
  const decision = useRoutingStore((s) => s.currentDecision);
  if (!decision) return null;
  return (
    <section className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rejected candidates</p>
          <h2 className="text-lg font-semibold text-white">Why not selected</h2>
        </div>
        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">{decision.rejectedCandidates.length}</span>
      </div>
      <div className="space-y-3">
        {decision.rejectedCandidates.map((c) => (
          <CandidateRow key={c.id} candidate={c} />
        ))}
      </div>
    </section>
  );
}

function ActivityPanel() {
  const history = useRoutingStore((s) => s.decisionHistory);
  return (
    <section className="glass-panel p-5">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Decision log</p>
        <h2 className="text-lg font-semibold text-white">Recent routing decisions</h2>
      </div>
      <div className="space-y-3">
        {history.map((d) => (
          <div key={d.taskId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-white">{d.selectedModel.name}</span>
                <span className="text-xs text-slate-500">{d.policyGate}</span>
              </div>
              <p className="text-xs text-slate-500">{new Date(d.timestamp).toLocaleTimeString()}</p>
            </div>
            <span className="text-xs text-slate-400 tabular-nums">{formatCost(d.estimatedCost)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const refreshProviders = useRoutingStore((s) => s.refreshProviders);
  useEffect(() => {
    const interval = setInterval(refreshProviders, 5000);
    return () => clearInterval(interval);
  }, [refreshProviders]);

  return (
    <>
      <Head>
        <title>Verdict AI Routing Cockpit — Demo Data</title>
        <meta name="description" content="Portfolio-ready AI model routing dashboard showing policy-gated decisions, rejected candidates, provider health, cost and latency. Demo data only." />
      </Head>
      <div className="min-h-screen bg-[#08080c] text-slate-200">
        <Header />
        <main className="mx-auto max-w-[1800px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)_420px]">
            <ProviderHealthPanel />
            <div className="space-y-5">
              <DecisionPanel />
              <RejectedPanel />
            </div>
            <div className="space-y-5">
              <ActivityPanel />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
