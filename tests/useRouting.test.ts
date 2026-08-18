import { renderHook, act } from '@testing-library/react';
import { useRouting, useCurrentDecision, useProviderHealth, usePolicyGate, useRoutingActions } from '../src/hooks/useRouting';

describe('useRouting hook — deterministic routing selectors', () => {
  beforeEach(() => {
    // Reset to a known fixture state
    const { setPolicyGate } = useRoutingStore.getState();
    setPolicyGate('cost-aware');
  });

  it('exposes providers, decision, history, and actions', () => {
    const { result } = renderHook(() => useRouting());
    expect(result.current.providers).toHaveLength(4);
    expect(result.current.currentDecision).not.toBeNull();
    expect(result.current.decisionHistory.length).toBeGreaterThan(0);
    expect(typeof result.current.setPolicyGate).toBe('function');
    expect(typeof result.current.simulateEvaluation).toBe('function');
    expect(typeof result.current.refreshProviders).toBe('function');
  });

  it('useCurrentDecision returns the selected model', () => {
    const { result } = renderHook(() => useCurrentDecision());
    expect(result.current).not.toBeNull();
    expect(result.current?.selectedModel.name).toBeDefined();
  });

  it('useProviderHealth returns all four demo providers', () => {
    const { result } = renderHook(() => useProviderHealth());
    expect(result.current.length).toBe(4);
    expect(result.current[0].name).toBe('OpenAI');
  });

  it('usePolicyGate returns current gate', () => {
    const { result } = renderHook(() => usePolicyGate());
    expect(result.current).toBe('cost-aware');
  });

  it('useRoutingActions provides mutable actions', () => {
    const { result } = renderHook(() => useRoutingActions());
    act(() => {
      result.current.setPolicyGate('quality-first');
    });
    // State change is reflected via the store
    expect(useRoutingStore.getState().policyGate).toBe('quality-first');
  });
});

// Need to import the store for direct state access in the last test
import { useRoutingStore } from '../src/lib/routingStore';
