import { renderHook, act } from '@testing-library/react';
import { useRoutingStore } from '../src/lib/routingStore';

describe('useRoutingStore — fixture-driven routing decisions', () => {
  beforeEach(() => {
    // Reset to a known fixture state
    useRoutingStore.setState({
      policyGate: 'cost-aware',
      isEvaluating: false,
      lastUpdate: new Date().toISOString(),
    });
  });

  it('initializes with demo fixtures', () => {
    const { result } = renderHook(() => useRoutingStore());
    expect(result.current.providers).toHaveLength(4);
    expect(result.current.currentDecision).not.toBeNull();
    expect(result.current.currentDecision?.selectedModel).toBeDefined();
    expect(result.current.currentDecision?.rejectedCandidates.length).toBeGreaterThan(0);
  });

  it('switches policy gate and re-evaluates', () => {
    const { result } = renderHook(() => useRoutingStore());
    const initialModel = result.current.currentDecision?.selectedModel.name;

    act(() => {
      result.current.setPolicyGate('quality-first');
    });

    expect(result.current.policyGate).toBe('quality-first');
    expect(result.current.currentDecision?.selectedModel.name).not.toBe(initialModel);
  });

  it('records decision history on policy change', () => {
    const { result } = renderHook(() => useRoutingStore());
    const initialHistoryLen = result.current.decisionHistory.length;

    act(() => {
      result.current.setPolicyGate('latency-first');
    });

    expect(result.current.decisionHistory.length).toBe(initialHistoryLen + 1);
  });

  it('marks evaluation state during simulateEvaluation', async () => {
    const { result } = renderHook(() => useRoutingStore());
    
    act(() => {
      result.current.simulateEvaluation();
    });
    
    expect(result.current.isEvaluating).toBe(true);

    // Wait for the async evaluation to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    expect(result.current.isEvaluating).toBe(false);
    expect(result.current.lastUpdate).toBeDefined();
  });

  it('provides demo fixtures for all four providers', () => {
    const { result } = renderHook(() => useRoutingStore());
    const providerNames = result.current.providers.map(p => p.name);
    expect(providerNames).toEqual(expect.arrayContaining(['OpenAI', 'Anthropic', 'Google', 'Mistral']));
  });

  it('includes fallback model in routing decision', () => {
    const { result } = renderHook(() => useRoutingStore());
    const fallback = result.current.currentDecision?.fallbackModel;
    expect(fallback).toBeDefined();
    expect(fallback?.name).toBe('GPT-4o Mini');
    expect(fallback?.status).toBe('fallback');
  });

  it('cost-aware gate prefers lower-cost models', () => {
    const { result } = renderHook(() => useRoutingStore());
    act(() => { result.current.setPolicyGate('cost-aware'); });
    const decision = result.current.currentDecision;
    expect(decision?.policyGate).toBe('cost-aware');
    // cost-aware should not pick the most expensive model (Claude 3.5 Sonnet at $3)
    expect(decision?.selectedModel.id).not.toBe('claude-3.5-sonnet');
  });
});
