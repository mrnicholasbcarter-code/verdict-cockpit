import { selectCurrentReport, useRouteLabStore } from '@/lib/routeLabStore';

export function useRouteLab<T>(selector: (state: ReturnType<typeof useRouteLabStore.getState>) => T) {
  return useRouteLabStore(selector);
}

export function useCurrentReport() {
  return useRouteLabStore(selectCurrentReport);
}

export function useReportSelection() {
  return useRouteLabStore((state) => ({
    reports: state.reports,
    currentReportId: state.currentReportId,
    selectReport: state.selectReport,
  }));
}
