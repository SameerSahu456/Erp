import { useMemo } from "react"

import { UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"
import { dateRangeToParams, toDateParam } from "@/shared/lib/date"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"
import type { ValueRange } from "@/components/common/pickers/ValueRangeInput"

import type { SOStatus } from "../../api"
import { SO_STATUS_LABELS } from "../../constants/so-status"
import {
  parseDateRange,
  parseEnumList,
  parseIdList,
  parseValueRange,
  useTabUrlParams,
} from "../shared/useTabUrlParams"

const SO_STATUSES = Object.keys(SO_STATUS_LABELS) as SOStatus[]
const join = (ids: string[]) => (ids.length > 0 ? ids.join(",") : null)

// Search + filters of the Sales Orders tab on the Account / Lead / Deal detail
// pages: SO number search, Submitted On range, Submitted By (multi), Status (multi),
// Category / OEM, Total range. All of it lives in the URL under the `so_` prefix
// (e.g. `?tab=orders&so_status=Approved`), so a refresh, a shared link and a trip
// into an order and back all keep it. Any change resets `so_page`.
export function useOrderTabFilters() {
  const { get, update } = useTabUrlParams("so")

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

  const submittedOn = useMemo(() => parseDateRange(rawFrom, rawTo), [rawFrom, rawTo])
  const submittedBy = useMemo(() => parseIdList(rawBy), [rawBy])
  const approvedBy = useMemo(() => parseIdList(rawAppr), [rawAppr])
  const statuses = useMemo(() => parseEnumList(rawStatus, SO_STATUSES), [rawStatus])
  const categories = useMemo(() => parseIdList(rawCat), [rawCat])
  const oems = useMemo(() => parseIdList(rawOem), [rawOem])
  const total = useMemo(() => parseValueRange(rawMin, rawMax), [rawMin, rawMax])

  const debouncedSearch =
    useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS) || undefined

  const setSearch = (next: string) => update({ q: next || null })
  const setSubmittedOn = (next: DateRange | undefined) =>
    update({
      from: next?.from ? toDateParam(next.from) : null,
      to: next?.to ? toDateParam(next.to) : null,
    })
  const setSubmittedBy = (next: string[]) => update({ by: join(next) })
  const setApprovedBy = (next: string[]) => update({ appr: join(next) })
  const setStatuses = (next: SOStatus[]) => update({ status: join(next) })
  const setCategories = (next: string[]) => update({ cat: join(next) })
  const setOems = (next: string[]) => update({ oem: join(next) })
  const setTotal = (next: ValueRange | undefined) =>
    update({
      min: next?.min != null ? String(next.min) : null,
      max: next?.max != null ? String(next.max) : null,
    })

  const hasDate = !!submittedOn?.from || !!submittedOn?.to
  const hasTotal = total?.min != null || total?.max != null
  const hasActive =
    search.trim() !== "" ||
    hasDate ||
    submittedBy.length > 0 ||
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
    submittedBy.length > 0,
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

  // The list API names the submitted-date bounds `submitted_from` / `submitted_to`.
  const { date_from: submitted_from, date_to: submitted_to } = dateRangeToParams(submittedOn)

  return {
    search,
    setSearch,
    submittedOn,
    setSubmittedOn,
    submittedBy,
    setSubmittedBy,
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
    /** Spread into the `useSalesOrders` params. */
    queryParams: {
      order_number: debouncedSearch,
      status: statuses.length > 0 ? statuses : undefined,
      category_ids: categories.length > 0 ? categories : undefined,
      oem_ids: oems.length > 0 ? oems : undefined,
      min_total: total?.min,
      max_total: total?.max,
      submitted_by: submittedBy.length > 0 ? submittedBy : undefined,
      approver_id: approvedBy.length > 0 ? approvedBy : undefined,
      submitted_from,
      submitted_to,
    },
  }
}
