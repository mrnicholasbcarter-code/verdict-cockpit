import { useRoutingStore } from '@/lib/routingStore';
import type { RoutingDecision, ModelCandidate, ProviderHealth } from '@/lib/routingStore';

export function useRouting() {
  const {
    providers,
    currentDecision,
    decisionHistory,
    policyGate,
    isEvaluating,
    lastUpdate,
    setPolicyGate,
    simulateEvaluation,
    refreshProviders,
  } = useRoutingStore();

  return {
    providers: providers as ProviderHealth[],
    currentDecision: currentDecision as RoutingDecision | null,
    decisionHistory: decisionHistory as RoutingDecision[],
    policyGate,
    isEvaluating,
    lastUpdate,
    setPolicyGate,
    simulateEvaluation,
    refreshProviders,
  };
}

export function useCurrentDecision() {
  return useRoutingStore((state) => state.currentDecision);
}

export function useProviderHealth() {
  return useRoutingStore((state) => state.providers);
}

export function usePolicyGate() {
  return useRoutingStore((state) => state.policyGate);
}

export function useRoutingActions() {
  return useRoutingStore((state) => ({
    setPolicyGate: state.setPolicyGate,
    simulateEvaluation: state.simulateEvaluation,
    refreshProviders: state.refreshProviders,
  }));
}
