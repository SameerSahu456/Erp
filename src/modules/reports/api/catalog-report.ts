import { apiClient } from '@shared/api/client'
import { endpoints } from '@shared/api/endpoints'

import type { ReportRow } from '../types'
import type { DateRange } from '../utils/date-presets'

/** Mirrors the backend `CatalogReportOut` (reports/catalog_schemas.py). */
export interface CatalogReportResponse {
  report_id: string
  /** False when the ERP does not hold the data this report needs yet. */
  available: boolean
  unavailable_reason: string | null
  /** True for "position right now" reports that ignore the selected period. */
  snapshot: boolean
  rows: ReportRow[]
  /** True when the report hit the server row cap and `rows` is incomplete. */
  truncated: boolean
  generated_at: string
}

export async function fetchCatalogReport(
  reportId: string,
  range: DateRange,
): Promise<CatalogReportResponse> {
  const qs = new URLSearchParams({ date_from: range.from, date_to: range.to })
  return apiClient.get<CatalogReportResponse>(
    `${endpoints.reports.catalogReport(reportId)}?${qs.toString()}`,
  )
}
