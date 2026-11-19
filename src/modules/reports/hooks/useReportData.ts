import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { fetchCatalogReport } from '../api/catalog-report'
import { REPORTS_QUERY_KEY } from '../constants/reports'
import type { DateRange } from '../utils/date-presets'

/** Rows for one catalog report over the selected period. Runs as soon as a
 *  report is open (no "Generate" step) and re-runs when the report or period
 *  changes. A custom range with a missing or inverted date does not fetch. */
export function useReportData(reportId: string, range: DateRange) {
  const ready = !!range.from && !!range.to && range.from <= range.to
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, 'catalog', reportId, range.from, range.to],
    queryFn: () => fetchCatalogReport(reportId, range),
    enabled: ready,
    // Keep the previous period's rows on screen while the new period loads,
    // but never show another report's rows under this report's columns.
    placeholderData: (prev, prevQuery) =>
      prevQuery?.queryKey[2] === reportId ? keepPreviousData(prev) : undefined,
    staleTime: 60_000,
  })
}
