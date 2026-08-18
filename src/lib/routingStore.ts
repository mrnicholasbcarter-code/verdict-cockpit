import { create } from 'zustand';

export interface ProviderHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastCheck: string;
  successRate: number;
}

export interface ModelCandidate {
  id: string;
  name: string;
  provider: string;
  status: 'selected' | 'rejected' | 'fallback' | 'evaluating';
  reason?: string;
  costPer1kTokens: number;
  latencyP50Ms: number;
  latencyP99Ms: number;
  capabilityScore: number;
  policyFlags: string[];
}

export interface RoutingDecision {
  taskId: string;
  taskType: string;
  selectedModel: ModelCandidate;
  rejectedCandidates: ModelCandidate[];
  fallbackModel?: ModelCandidate;
  policyGate: 'cost-aware' | 'latency-first' | 'quality-first' | 'balanced';
  timestamp: string;
  estimatedCost: number;
  estimatedLatencyMs: number;
}

export interface RoutingState {
  providers: ProviderHealth[];
  currentDecision: RoutingDecision | null;
  decisionHistory: RoutingDecision[];
  policyGate: 'cost-aware' | 'latency-first' | 'quality-first' | 'balanced';
  isEvaluating: boolean;
  lastUpdate: string;
  setPolicyGate: (gate: RoutingState['policyGate']) => void;
  simulateEvaluation: () => void;
  refreshProviders: () => void;
}

const fixtureProviders: ProviderHealth[] = [
  { name: 'OpenAI', status: 'healthy', latencyMs: 42, lastCheck: '2026-08-15T06:12:00Z', successRate: 99.8 },
  { name: 'Anthropic', status: 'healthy', latencyMs: 58, lastCheck: '2026-08-15T06:11:45Z', successRate: 99.5 },
  { name: 'Google', status: 'degraded', latencyMs: 180, lastCheck: '2026-08-15T06:10:30Z', successRate: 97.2 },
  { name: 'Mistral', status: 'healthy', latencyMs: 35, lastCheck: '2026-08-15T06:11:55Z', successRate: 98.9 },
];

const fixtureModels: ModelCandidate[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    status: 'evaluating',
    costPer1kTokens: 2.50,
    latencyP50Ms: 850,
    latencyP99Ms: 2100,
    capabilityScore: 94,
    policyFlags: ['high-cost', 'high-capability'],
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    status: 'evaluating',
    costPer1kTokens: 3.00,
    latencyP50Ms: 1100,
    latencyP99Ms: 2800,
    capabilityScore: 96,
    policyFlags: ['high-cost', 'high-capability', 'long-context'],
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    status: 'evaluating',
    costPer1kTokens: 1.25,
    latencyP50Ms: 650,
    latencyP99Ms: 1800,
    capabilityScore: 91,
    policyFlags: ['cost-effective', 'long-context'],
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral',
    status: 'evaluating',
    costPer1kTokens: 0.80,
    latencyP50Ms: 420,
    latencyP99Ms: 1200,
    capabilityScore: 87,
    policyFlags: ['low-cost', 'fast'],
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    status: 'evaluating',
    costPer1kTokens: 0.15,
    latencyP50Ms: 380,
    latencyP99Ms: 950,
    capabilityScore: 82,
    policyFlags: ['low-cost', 'fast', 'fallback'],
  },
];

function evaluateModels(gate: RoutingState['policyGate'], models: ModelCandidate[], providers: ProviderHealth[]): RoutingDecision {
  const healthyProviders = providers.filter(p => p.status === 'healthy').map(p => p.name);
  const availableModels = models.filter(m => healthyProviders.includes(m.provider));
  
  let scored = availableModels.map(m => {
    let score = m.capabilityScore;
    if (gate === 'cost-aware') score -= (m.costPer1kTokens * 10);
    if (gate === 'latency-first') score -= (m.latencyP50Ms / 50);
    if (gate === 'quality-first') score += (m.capabilityScore * 0.5);
    if (gate === 'balanced') score = m.capabilityScore - (m.costPer1kTokens * 5) - (m.latencyP50Ms / 100);
    return { ...m, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  const selected = { ...scored[0], status: 'selected' as const };
  const rejected = scored.slice(1).map(m => ({ ...m, status: 'rejected' as const, reason: getRejectionReason(m, selected, gate) }));
  
  const fallback = scored.find(m => m.policyFlags.includes('fallback')) 
    ? { ...scored.find(m => m.policyFlags.includes('fallback'))!, status: 'fallback' as const }
    : undefined;
  
  return {
    taskId: `task-${Date.now()}`,
    taskType: 'code-generation',
    selectedModel: selected,
    rejectedCandidates: rejected,
    fallbackModel: fallback,
    policyGate: gate,
    timestamp: new Date().toISOString(),
    estimatedCost: selected.costPer1kTokens * 1.5,
    estimatedLatencyMs: selected.latencyP50Ms,
  };
}

function getRejectionReason(model: ModelCandidate, selected: ModelCandidate, gate: string): string {
  if (gate === 'cost-aware' && model.costPer1kTokens > selected.costPer1kTokens * 1.5) {
    return `Cost $${model.costPer1kTokens}/1k exceeds budget threshold`;
  }
  if (gate === 'latency-first' && model.latencyP50Ms > selected.latencyP50Ms * 1.5) {
    return `Latency ${model.latencyP50Ms}ms exceeds threshold`;
  }
  if (gate === 'quality-first' && model.capabilityScore < selected.capabilityScore - 5) {
    return `Capability score ${model.capabilityScore} below quality floor`;
  }
  if (gate === 'balanced') {
    if (model.costPer1kTokens > selected.costPer1kTokens * 2) return 'Cost efficiency insufficient';
    if (model.latencyP50Ms > selected.latencyP50Ms * 2) return 'Latency too high for balanced profile';
  }
  return 'Lower composite score under current policy';
}

const initialDecision = evaluateModels('cost-aware', fixtureModels, fixtureProviders);

export const useRoutingStore = create<RoutingState>((set) => ({
  providers: fixtureProviders,
  currentDecision: initialDecision,
  decisionHistory: [initialDecision],
  policyGate: 'cost-aware',
  isEvaluating: false,
  lastUpdate: new Date().toISOString(),
  setPolicyGate: (gate) => {
    const state = useRoutingStore.getState();
    const decision = evaluateModels(gate, fixtureModels, state.providers);
    set({
      policyGate: gate,
      currentDecision: decision,
      decisionHistory: [decision, ...state.decisionHistory.slice(0, 9)],
      lastUpdate: new Date().toISOString(),
    });
  },
  simulateEvaluation: () => {
    set({ isEvaluating: true });
    setTimeout(() => {
      const state = useRoutingStore.getState();
      const decision = evaluateModels(state.policyGate, fixtureModels, state.providers);
      set({
        isEvaluating: false,
        currentDecision: decision,
        decisionHistory: [decision, ...state.decisionHistory.slice(0, 9)],
        lastUpdate: new Date().toISOString(),
      });
    }, 800);
  },
  refreshProviders: () => {
    const jittered = fixtureProviders.map(p => ({
      ...p,
      latencyMs: p.latencyMs + Math.floor(Math.random() * 20) - 10,
      successRate: Math.max(95, Math.min(100, p.successRate + (Math.random() - 0.5) * 0.5)),
      lastCheck: new Date().toISOString(),
    }));
    set({ providers: jittered, lastUpdate: new Date().toISOString() });
  },
}));

export const formatCost = (val: number) => `$${val.toFixed(2)}`;
export const formatLatency = (val: number) => `${val}ms`;
