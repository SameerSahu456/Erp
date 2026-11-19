import { useState } from "react"
import { useSearchParams } from "react-router-dom"

import { type DateRange } from "@/components/common/pickers/DateRangePicker"
import { dateRangeToParams, parseDateParam } from "@shared/lib/date"

import { FILTER_CONFIG } from "./user-activity.config"
import { type FilterKey } from "./user-activity.types"

/**
 * Owns the timeline's filter / page / date-range state and the set of
 * expanded change-diffs. When `urlKey` is set the pager page, tab, and date
 * window live in the URL (under `${urlKey}Page` / `Tab` / `From` / `To`) so
 * browser-back restores them; otherwise they're plain local state. Writes are
 * replace-mode (no history spam) and reset the page to 1 on tab/date change.
 */
export function useUserActivityTimelineState(urlKey?: string) {
  const [searchParams, setSearchParams] = useSearchParams()

  const synced = Boolean(urlKey)
  const kPage = `${urlKey}Page`
  const kTab = `${urlKey}Tab`
  const kFrom = `${urlKey}From`
  const kTo = `${urlKey}To`

  const [localFilter, setLocalFilter] = useState<FilterKey>("all")
  // Which field_change rows have their diff expanded (by entry id). Toggling
  // the "Show changes" button expands inline; it never navigates.
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set())
  const toggleChanges = (id: string) =>
    setExpandedChanges((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  // Pager mode: current page (1-indexed). Inert in scroll mode.
  const [localPage, setLocalPage] = useState(1)
  // Created-date range filter (mirrors CRM leads).
  const [localRange, setLocalRange] = useState<DateRange | undefined>(undefined)

  const rawTab = searchParams.get(kTab)
  const activeFilter: FilterKey = synced
    ? rawTab && rawTab in FILTER_CONFIG
      ? (rawTab as FilterKey)
      : "all"
    : localFilter
  const page = synced ? Math.max(1, Number(searchParams.get(kPage) ?? "1") || 1) : localPage
  const urlFrom = parseDateParam(searchParams.get(kFrom))
  const urlTo = parseDateParam(searchParams.get(kTo))
  const dateRange: DateRange | undefined = synced
    ? urlFrom || urlTo
      ? { from: urlFrom, to: urlTo }
      : undefined
    : localRange
  const { date_from, date_to } = dateRangeToParams(dateRange)

  const setPage = (next: number) => {
    if (!synced) return setLocalPage(next)
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next <= 1) p.delete(kPage)
        else p.set(kPage, String(next))
        return p
      },
      { replace: true },
    )
  }
  const setActiveFilter = (next: FilterKey) => {
    if (!synced) {
      setLocalFilter(next)
      setLocalPage(1)
      return
    }
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === "all") p.delete(kTab)
        else p.set(kTab, next)
        p.delete(kPage)
        return p
      },
      { replace: true },
    )
  }
  const setDateRange = (next: DateRange | undefined) => {
    if (!synced) {
      setLocalRange(next)
      setLocalPage(1)
      return
    }
    const { date_from: nf, date_to: nt } = dateRangeToParams(next)
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (nf) p.set(kFrom, nf)
        else p.delete(kFrom)
        if (nt) p.set(kTo, nt)
        else p.delete(kTo)
        p.delete(kPage)
        return p
      },
      { replace: true },
    )
  }

  return {
    activeFilter,
    setActiveFilter,
    page,
    setPage,
    dateRange,
    setDateRange,
    date_from,
    date_to,
    expandedChanges,
    toggleChanges,
  }
}
