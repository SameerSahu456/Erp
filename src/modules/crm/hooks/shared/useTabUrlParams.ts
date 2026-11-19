import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

import type { DateRange } from "@/components/common/pickers/DateRangePicker"
import type { ValueRange } from "@/components/common/pickers/ValueRangeInput"
import { parseDateParam } from "@/shared/lib/date"
import { exceedsMoneyDigits, isUuid, parseNonNegativeNumber } from "@/shared/lib/validation"

// URL-backed state for the embedded detail-page tabs (Deals / Quotes / Sales
// Orders). Each tab owns a short key prefix (`dl`, `qt`, `so`) so several tabs can
// keep filters on one page without clashing — e.g. `?tab=quotes&qt_status=Approved`.
// The values therefore survive a refresh, a shared link and a detail round-trip.
//
// Every change goes through ONE `setSearchParams` call and drops the tab's own
// `<prefix>_page`, so a filter change lands on page 1 and several fields can be
// changed together (Clear all) without one update overwriting another.

/** Max digits accepted for a money bound (NUMERIC(14, 2)). */
const MONEY_MAX_DIGITS = 14

export function useTabUrlParams(prefix: string) {
  const [params, setParams] = useSearchParams()

  const get = useCallback((name: string) => params.get(`${prefix}_${name}`) ?? "", [params, prefix])

  /** Set / clear several keys at once (`null` or "" removes one) and reset the tab's page. */
  const update = useCallback(
    (updates: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [name, value] of Object.entries(updates)) {
            if (value) next.set(`${prefix}_${name}`, value)
            else next.delete(`${prefix}_${name}`)
          }
          if (!("page" in updates)) next.delete(`${prefix}_page`)
          return next
        },
        { replace: true },
      )
    },
    [setParams, prefix],
  )

  return { get, update }
}

// ── Parsers — URL values are untrusted input (§11.1): keep only what is valid. ──

/** Comma-separated UUIDs → the valid ones. */
export function parseIdList(raw: string): string[] {
  return raw ? raw.split(",").filter((v) => isUuid(v)) : []
}

/** Comma-separated values → those in the allow-list. */
export function parseEnumList<T extends string>(raw: string, allowed: readonly T[]): T[] {
  return raw ? raw.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v)) : []
}

/** One value → itself when in the allow-list, else "". */
export function parseEnum<T extends string>(raw: string, allowed: readonly T[]): T | "" {
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : ""
}

/** Two `YYYY-MM-DD` values → a range (real dates only; an inverted pair is swapped). */
export function parseDateRange(fromRaw: string, toRaw: string): DateRange | undefined {
  let from = parseDateParam(fromRaw)
  let to = parseDateParam(toRaw)
  if (!from && !to) return undefined
  if (from && to && from > to) [from, to] = [to, from]
  return { from, to }
}

/** Two numeric strings → a range (non-negative, within the money digit cap). */
export function parseValueRange(minRaw: string, maxRaw: string): ValueRange | undefined {
  const ok = (raw: string) => raw !== "" && !exceedsMoneyDigits(raw, MONEY_MAX_DIGITS, 2)
  const min = ok(minRaw) ? parseNonNegativeNumber(minRaw) : undefined
  const max = ok(maxRaw) ? parseNonNegativeNumber(maxRaw) : undefined
  if (min == null && max == null) return undefined
  return { min, max }
}
