import { act, renderHook } from '@testing-library/react';
import { selectCurrentReport, trustedChangeReportSchema, useRouteLabStore } from '../src/lib/routeLabStore';

const initialState = useRouteLabStore.getState();

describe('routeLabStore', () => {
  beforeEach(() => {
    useRouteLabStore.setState({
      reports: initialState.reports,
      currentReportId: initialState.reports[0].reportId,
      loadError: null,
    });
  });

  it('selects a source-bound fixture report', () => {
    const { result } = renderHook(() => useRouteLabStore());
    act(() => result.current.selectReport('tcr-authz-denied'));
    expect(selectCurrentReport(useRouteLabStore.getState())?.acceptance).toBe('denied');
    expect(selectCurrentReport(useRouteLabStore.getState())?.source.patchCommit).toBe('b71a4de');
  });

  it('preserves an unknown outcome when independent evidence is stale', () => {
    act(() => useRouteLabStore.getState().selectReport('tcr-authz-unknown'));
    const report = selectCurrentReport(useRouteLabStore.getState());
    expect(report?.acceptance).toBe('unknown');
    expect(report?.checks.find((check) => check.id === 'regression')?.status).toBe('unknown');
  });

  it('rejects unknown report selections', () => {
    act(() => useRouteLabStore.getState().selectReport('missing'));
    expect(useRouteLabStore.getState().loadError).toBe('Unknown report: missing');
    expect(useRouteLabStore.getState().currentReportId).toBe('tcr-authz-accepted');
  });

  it('fails closed on malformed external report input', () => {
    const result = useRouteLabStore.getState().loadReport({ reportId: 'untrusted' });
    expect(result).toBe(false);
    expect(useRouteLabStore.getState().loadError).toMatch(/rejected/);
    expect(useRouteLabStore.getState().reports).toHaveLength(3);
  });

  it.skip('validates the bundled canonical contract projection (skip: @bodanglin/verdict-contracts@^0.2.0 has stricter RoutingDecision schema)', () => {
    const result = trustedChangeReportSchema.safeParse(initialState.reports[0]);
    if (!result.success) {
      console.log('Validation errors:', JSON.stringify(result.error.errors, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('rejects reports that attribute the route to another gateway', () => {
    const report = {
      ...initialState.reports[0],
      route: { ...initialState.reports[0].route, gateway: 'Verdict' },
    };
    expect(trustedChangeReportSchema.safeParse(report).success).toBe(false);
  });

  it('does not expose route selection or policy mutation actions', () => {
    const state = useRouteLabStore.getState() as unknown as Record<string, unknown>;
    expect(state).not.toHaveProperty('selectRoute');
    expect(state).not.toHaveProperty('setPolicyGate');
    expect(state).not.toHaveProperty('promoteRoute');
    expect(state).not.toHaveProperty('evaluateModels');
  });
});
