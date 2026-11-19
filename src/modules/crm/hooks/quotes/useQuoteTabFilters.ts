import { useMemo } from "react"

import { UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"
import { dateRangeToParams, toDateParam } from "@/shared/lib/date"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"
import type { ValueRange } from "@/components/common/pickers/ValueRangeInput"

import type { QuoteStatus } from "../../api"
import { QUOTE_FILTER_STATUSES } from "../../constants/quote-status"
import {
  parseDateRange,
  parseEnumList,
  parseIdList,
  parseValueRange,
  useTabUrlParams,
} from "../shared/useTabUrlParams"

const QUOTE_STATUSES = QUOTE_FILTER_STATUSES
const join = (ids: string[]) => (ids.length > 0 ? ids.join(",") : null)

// Search + filters of the Quotes tab on the Account / Lead / Deal detail pages:
// quote number search, Created On range, Created By / Approved By (multi), Status
// (multi), Category / OEM, Total range. All of it lives in the URL under the `qt_`
// prefix (e.g. `?tab=quotes&qt_status=Approved&qt_cat=<id>`), so a refresh, a shared
// link and a trip into a quote and back all keep it. Any change resets `qt_page`.
export function useQuoteTabFilters() {
  const { get, update } = useTabUrlParams("qt")

  const search = get("q").slice(0, UI.FILTER_SEARCH_MAX_LENGTH)
  const rawFrom = get("from")
  const rawTo = get("to")
  const rawBy = get("by")
  const rawAppr = get("appr")
  const rawStatus = get("status")
  const rawCat = get("cat")
  const rawOem = get("oem")
  const rawMin = get("min")
  const rawMax = get("max")

  const createdOn = useMemo(() => parseDateRange(rawFrom, rawTo), [rawFrom, rawTo])
  const createdBy = useMemo(() => parseIdList(rawBy), [rawBy])
  const approvedBy = useMemo(() => parseIdList(rawAppr), [rawAppr])
  const statuses = useMemo(() => parseEnumList(rawStatus, QUOTE_STATUSES), [rawStatus])
  const categories = useMemo(() => parseIdList(rawCat), [rawCat])
  const oems = useMemo(() => parseIdList(rawOem), [rawOem])
  const total = useMemo(() => parseValueRange(rawMin, rawMax), [rawMin, rawMax])

  const debouncedSearch =
    useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS) || undefined

  const setSearch = (next: string) => update({ q: next || null })
  const setCreatedOn = (next: DateRange | undefined) =>
    update({
      from: next?.from ? toDateParam(next.from) : null,
      to: next?.to ? toDateParam(next.to) : null,
    })
  const setCreatedBy = (next: string[]) => update({ by: join(next) })
  const setApprovedBy = (next: string[]) => update({ appr: join(next) })
  const setStatuses = (next: QuoteStatus[]) => update({ status: join(next) })
  const setCategories = (next: string[]) => update({ cat: join(next) })
  const setOems = (next: string[]) => update({ oem: join(next) })
  const setTotal = (next: ValueRange | undefined) =>
    update({
      min: next?.min != null ? String(next.min) : null,
      max: next?.max != null ? String(next.max) : null,
    })

  const hasDate = !!createdOn?.from || !!createdOn?.to
  const hasTotal = total?.min != null || total?.max != null
  const hasActive =
    search.trim() !== "" ||
    hasDate ||
    createdBy.length > 0 ||
    approvedBy.length > 0 ||
    statuses.length > 0 ||
    categories.length > 0 ||
    oems.length > 0 ||
    hasTotal

  // Everything except the search text counts toward the Filters button / sidebar
  // Clear all (same as the Accounts list) — including the toolbar chips.
  const asideActiveCount = [
    hasDate,
    statuses.length > 0,
    createdBy.length > 0,
    approvedBy.length > 0,
    categories.length > 0,
    oems.length > 0,
    hasTotal,
  ].filter(Boolean).length

  const FILTER_KEYS = ["from", "to", "by", "appr", "status", "cat", "oem", "min", "max"]
  const clearedFilters = Object.fromEntries(FILTER_KEYS.map((k) => [k, null]))
  // One navigation for every key, so nothing overwrites anything.
  const resetAside = () => update(clearedFilters)
  const clearAll = () => update({ ...clearedFilters, q: null })

  const { date_from, date_to } = dateRangeToParams(createdOn)

  return {
    search,
    setSearch,
    createdOn,
    setCreatedOn,
    createdBy,
    setCreatedBy,
    approvedBy,
    setApprovedBy,
    statuses,
    setStatuses,
    categories,
    setCategories,
    oems,
    setOems,
    total,
    setTotal,
    hasActive,
    asideActiveCount,
    resetAside,
    clearAll,
    /** Spread into the `useQuotes` params. */
    queryParams: {
      quote_number: debouncedSearch,
      status: statuses.length > 0 ? statuses : undefined,
      category_ids: categories.length > 0 ? categories : undefined,
      oem_ids: oems.length > 0 ? oems : undefined,
      min_total: total?.min,
      max_total: total?.max,
      created_by: createdBy.length > 0 ? createdBy : undefined,
      approved_by: approvedBy.length > 0 ? approvedBy : undefined,
      date_from,
      date_to,
    },
  }
}
