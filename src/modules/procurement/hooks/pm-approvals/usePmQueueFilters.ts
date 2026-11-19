import { useCallback, useEffect, useMemo } from "react"

import { useDebounce, useFilterParams } from "@shared/hooks"
import { UI } from "@/shared/constants"
import { parseDateParam, toDateParam } from "@/shared/lib/date"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A real calendar `YYYY-MM-DD` or `""` — `parseDateParam` alone would roll
 *  `2026-13-45` over into a different day, so the value must round-trip (§11.1). */
function cleanDate(raw: string): string {
  const d = parseDateParam(raw)
  return d && toDateParam(d) === raw ? raw : ""
}

/** Comma-separated id list from the URL → only the well-formed UUIDs (§11.1). */
function parseIds(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
}

export type PmSortDirection = "asc" | "desc" | null

export interface PmQueueSort {
  /** Sorted column key (the TABLE column key), or null for the default order. */
  column: string | null
  direction: PmSortDirection
}

/** Column sort → the backend `sort` param (`field` / `-field`), via the tab's
 *  column-key → backend-field map. Undefined = the endpoint's default order. */
export function toSortParam(
  sort: PmQueueSort,
  fieldFor: Record<string, string>,
): string | undefined {
  if (!sort.column || !sort.direction) return undefined
  const field = fieldFor[sort.column]
  if (!field) return undefined
  return sort.direction === "desc" ? `-${field}` : field
}

export interface PmQueueFilters {
  /** Live search box text (URL-backed; what the input shows). */
  searchInput: string
  setSearch: (value: string) => void
  /** Trimmed + debounced — what goes to the API. */
  search: string
  accountIds: string[]
  setAccountIds: (ids: string[]) => void
  userIds: string[]
  setUserIds: (ids: string[]) => void
  /** Date-range filter (picker value) + its `YYYY-MM-DD` wire bounds. */
  dateRange: DateRange | undefined
  setDateRange: (next: DateRange | undefined) => void
  dateFrom: string | undefined
  dateTo: string | undefined
  /** Server sort for this tab (URL-backed `<prefix>_sort`). */
  sort: PmQueueSort
  setSort: (column: string | null, direction: PmSortDirection) => void
  /** Clears this tab's search + filters + sort (and its page). */
  clear: () => void
  /** True when any search / filter is set. */
  active: boolean
}

/**
 * Search + filter state for ONE PM Approvals queue tab, kept in the URL under
 * that tab's own keys (`<prefix>_q`, `<prefix>_acc`, `<prefix>_user`,
 * `<prefix>_from` / `<prefix>_to`) so the
 * tabs never clobber each other and a Back from an approval page restores
 * them. Any change resets the tab's page (`<prefix>_page`). Mirrors the
 * Accounts page's `useAccountApprovals` toolbar wiring.
 *
 * URL values are validated on read (§11.1): malformed ids and non-calendar
 * dates are dropped, an inverted date range is swapped, and the URL is
 * rewritten (replace) to match what was actually applied — the backend 422s
 * on a non-UUID or an inverted range, so neither is ever sent.
 */
export function usePmQueueFilters(
  prefix: string,
  /** Table column keys this tab may sort by; anything else in the URL is
   *  dropped (§11.1) so an unknown sort is never sent to the API. */
  sortKeys: readonly string[] = [],
): PmQueueFilters {
  const pageKey = `${prefix}_page`
  const qKey = `${prefix}_q`
  const accKey = `${prefix}_acc`
  const userKey = `${prefix}_user`
  const fromKey = `${prefix}_from`
  const toKey = `${prefix}_to`
  const sortKey = `${prefix}_sort`
  const { get, set, setMany } = useFilterParams({ pageKey })

  const searchInput = get(qKey, "")
  const search = useDebounce(searchInput.trim(), UI.DEBOUNCE_SEARCH_MS)
  const rawAcc = get(accKey, "")
  const rawUser = get(userKey, "")
  const accountIds = useMemo(() => parseIds(rawAcc), [rawAcc])
  const userIds = useMemo(() => parseIds(rawUser), [rawUser])
  const rawFrom = get(fromKey, "")
  const rawTo = get(toKey, "")
  // Clean, then swap an inverted pair (ISO strings compare chronologically).
  const [dateFrom, dateTo] = useMemo(() => {
    const f = cleanDate(rawFrom)
    const t = cleanDate(rawTo)
    return f && t && f > t ? [t, f] : [f, t]
  }, [rawFrom, rawTo])

  // `<prefix>_sort` = `column` (asc) or `-column` (desc), column allow-listed.
  const rawSort = get(sortKey, "")
  const sort = useMemo<PmQueueSort>(() => {
    const desc = rawSort.startsWith("-")
    const column = desc ? rawSort.slice(1) : rawSort
    return column && sortKeys.includes(column)
      ? { column, direction: desc ? "desc" : "asc" }
      : { column: null, direction: null }
  }, [rawSort, sortKeys])
  const cleanSort = sort.column
    ? `${sort.direction === "desc" ? "-" : ""}${sort.column}`
    : ""

  // Repair: drop malformed ids from the URL (no-op when it's already clean).
  useEffect(() => {
    const repairs: Record<string, string | null> = {}
    if (rawAcc && rawAcc !== accountIds.join(",")) repairs[accKey] = accountIds.join(",") || null
    if (rawUser && rawUser !== userIds.join(",")) repairs[userKey] = userIds.join(",") || null
    if (rawFrom !== dateFrom) repairs[fromKey] = dateFrom || null
    if (rawTo !== dateTo) repairs[toKey] = dateTo || null
    if (rawSort !== cleanSort) repairs[sortKey] = cleanSort || null
    if (Object.keys(repairs).length > 0) setMany(repairs)
  }, [
    rawAcc, rawUser, accountIds, userIds, accKey, userKey,
    rawFrom, rawTo, dateFrom, dateTo, fromKey, toKey, setMany,
    rawSort, cleanSort, sortKey,
  ])

  const setSearch = useCallback((value: string) => set(qKey, value || null), [set, qKey])
  const setAccountIds = useCallback(
    (ids: string[]) => set(accKey, ids.length ? ids.join(",") : null),
    [set, accKey],
  )
  const setUserIds = useCallback(
    (ids: string[]) => set(userKey, ids.length ? ids.join(",") : null),
    [set, userKey],
  )
  const dateRange = useMemo<DateRange | undefined>(
    () =>
      dateFrom || dateTo
        ? { from: parseDateParam(dateFrom), to: parseDateParam(dateTo) }
        : undefined,
    [dateFrom, dateTo],
  )
  // Both bounds in ONE navigation (setMany also resets this tab's page).
  const setDateRange = useCallback(
    (next: DateRange | undefined) =>
      setMany({
        [fromKey]: next?.from ? toDateParam(next.from) : null,
        [toKey]: next?.to ? toDateParam(next.to) : null,
      }),
    [setMany, fromKey, toKey],
  )
  // Header click → URL (set() also resets this tab's page to 1).
  const setSort = useCallback(
    (column: string | null, direction: PmSortDirection) =>
      set(
        sortKey,
        column && direction ? `${direction === "desc" ? "-" : ""}${column}` : null,
      ),
    [set, sortKey],
  )
  const clear = useCallback(
    () =>
      setMany({
        [qKey]: null,
        [accKey]: null,
        [userKey]: null,
        [fromKey]: null,
        [toKey]: null,
        [sortKey]: null,
      }),
    [setMany, qKey, accKey, userKey, fromKey, toKey, sortKey],
  )

  return {
    searchInput,
    setSearch,
    search,
    accountIds,
    setAccountIds,
    userIds,
    setUserIds,
    dateRange,
    setDateRange,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sort,
    setSort,
    clear,
    active:
      Boolean(searchInput.trim()) ||
      accountIds.length > 0 ||
      userIds.length > 0 ||
      Boolean(dateFrom || dateTo),
  }
}
