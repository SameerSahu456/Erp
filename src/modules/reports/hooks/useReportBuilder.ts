import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  DEFAULT_REPORT_ID,
  findReport,
  isReportId,
  searchReports,
  type ReportEntry,
} from '../data/report-catalog'
import {
  getPresetDates,
  isDatePreset,
  type DatePreset,
  type DateRange,
} from '../utils/date-presets'

/** `list` (the table) is the default; `chart` is opt-in and kept in the URL. */
export type ReportView = 'list' | 'chart'
const DEFAULT_VIEW: ReportView = 'list'

const PARAM_REPORT = 'report'
const PARAM_VIEW = 'view'

export interface ReportBuilderController {
  report: ReportEntry
  /** Set when the URL named a report that does not exist; we fell back to the default. */
  unknownReportId: string | null
  view: ReportView
  setView: (v: ReportView) => void
  selectReport: (id: string) => void
  query: string
  setQuery: (q: string) => void
  visibleCategories: ReturnType<typeof searchReports>
  preset: DatePreset
  range: DateRange
  setPreset: (p: DatePreset) => void
  setRange: (r: DateRange) => void
}

/** Owns every piece of Reports Center state.
 *
 *  `report` and `view` live in the URL so a report can be shared / bookmarked
 *  and Back returns to the previous one. Per guideline §11.1 both are
 *  validated before use: an unknown report id or view falls back to the
 *  default and the URL is rewritten (replace) to what actually rendered, with
 *  `unknownReportId` exposed so the page can say what changed. The default
 *  view (`list`) is never written to the URL, so a clean link stays clean. */
export function useReportBuilder(): ReportBuilderController {
  const [params, setParams] = useSearchParams()

  const rawReport = params.get(PARAM_REPORT)
  const rawView = params.get(PARAM_VIEW)
  const view: ReportView = rawView === 'chart' ? 'chart' : DEFAULT_VIEW
  const reportId = isReportId(rawReport) ? rawReport : DEFAULT_REPORT_ID

  // The invalid id is captured in state the moment it is seen (the "adjust
  // state while rendering" pattern, keyed on the raw param), because the
  // repair effect below rewrites the URL on the next tick and a purely derived
  // flag would vanish before the user could read the notice.
  const invalidRaw = rawReport !== null && rawReport !== reportId ? rawReport : null
  const [seenRaw, setSeenRaw] = useState(rawReport)
  const [unknownReportId, setUnknownReportId] = useState<string | null>(invalidRaw)
  if (seenRaw !== rawReport) {
    setSeenRaw(rawReport)
    if (invalidRaw) setUnknownReportId(invalidRaw)
  }

  // Canonicalise the URL once if it carried an invalid value. A clean URL is a
  // strict no-op (no rewrite, no re-render).
  useEffect(() => {
    const needsReport = rawReport !== null && rawReport !== reportId
    // Anything other than `chart` (including the old `table` value and an
    // explicit `list`) is the default view and is dropped from the URL.
    const needsView = rawView !== null && rawView !== 'chart'
    if (!needsReport && !needsView) return
    const next = new URLSearchParams(params)
    if (needsReport) next.set(PARAM_REPORT, reportId)
    if (needsView) next.delete(PARAM_VIEW)
    setParams(next, { replace: true })
  }, [params, rawReport, rawView, reportId, setParams])

  const selectReport = useCallback(
    (id: string) => {
      if (!isReportId(id) || id === reportId) return
      setUnknownReportId(null)
      const next = new URLSearchParams(params)
      next.set(PARAM_REPORT, id)
      setParams(next)
    },
    [params, reportId, setParams],
  )

  const setView = useCallback(
    (v: ReportView) => {
      const next = new URLSearchParams(params)
      if (v === DEFAULT_VIEW) next.delete(PARAM_VIEW)
      else next.set(PARAM_VIEW, v)
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const [query, setQuery] = useState('')
  const visibleCategories = useMemo(() => searchReports(query), [query])

  const [preset, setPresetState] = useState<DatePreset>('thisMonth')
  const [range, setRangeState] = useState<DateRange>(() => getPresetDates('thisMonth'))

  const setPreset = useCallback((p: DatePreset) => {
    if (!isDatePreset(p)) return
    setPresetState(p)
    if (p !== 'custom') setRangeState(getPresetDates(p))
  }, [])

  const setRange = useCallback((r: DateRange) => {
    setPresetState('custom')
    setRangeState(r)
  }, [])

  // `reportId` is valid by construction, so the lookup cannot miss.
  const report = findReport(reportId) ?? (findReport(DEFAULT_REPORT_ID) as ReportEntry)

  return {
    report,
    unknownReportId,
    view,
    setView,
    selectReport,
    query,
    setQuery,
    visibleCategories,
    preset,
    range,
    setPreset,
    setRange,
  }
}
