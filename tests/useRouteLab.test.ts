import { act, renderHook } from '@testing-library/react';
import { useCurrentReport, useReportSelection } from '../src/hooks/useRouteLab';
import { useRouteLabStore } from '../src/lib/routeLabStore';

const initialState = useRouteLabStore.getState();

describe('Route Lab hooks', () => {
  beforeEach(() => {
    useRouteLabStore.setState({ reports: initialState.reports, currentReportId: 'tcr-authz-accepted', loadError: null });
  });

  it('selects only the current report projection', () => {
    const { result } = renderHook(() => useCurrentReport());
    expect(result.current?.reportId).toBe('tcr-authz-accepted');
    expect(result.current?.route.gateway).toBe('OmniRoute');
  });

  it('exposes report navigation without policy actions', () => {
    const { result } = renderHook(() => useReportSelection());
    act(() => result.current.selectReport('tcr-authz-denied'));
    expect(result.current.currentReportId).toBe('tcr-authz-denied');
    expect(Object.keys(result.current).sort()).toEqual(['currentReportId', 'reports', 'selectReport']);
  });
});
