import { useMemo } from "react"

import { UI } from "@/shared/constants"
import { useDebounce } from "@/shared/hooks"
import { dateRangeToParams, toDateParam } from "@/shared/lib/date"
import type { DateRange } from "@/components/common/pickers/DateRangePicker"

import type { DealStage } from "../../api"
import { DEAL_STAGE_LABELS } from "../../constants/deal-stages"
import {
  parseDateRange,
  parseEnum,
  parseIdList,
  useTabUrlParams,
} from "../shared/useTabUrlParams"

const DEAL_STAGES = Object.keys(DEAL_STAGE_LABELS) as DealStage[]
const join = (ids: string[]) => (ids.length > 0 ? ids.join(",") : null)

// Search + filters of the Deals tab on the Account detail page: deal number / name
// search, Created On range, Account Owner (multi), Stage, Category / OEM, Closed Date
// range (the won date). All of it lives in the URL under the `dl_` prefix (e.g.
// `?tab=deals&dl_stage=Closed%20Won`), so a refresh, a shared link and a trip into a
// deal and back all keep it. Any change resets `dl_page`.
export function useAccountDealsFilters() {
  const { get, update } = useTabUrlParams("dl")

  const search = get("q").slice(0, UI.FILTER_SEARCH_MAX_LENGTH)
  const rawFrom = get("from")
  const rawTo = get("to")
  const rawCFrom = get("cfrom")
  const rawCTo = get("cto")
  const rawOwner = get("owner")
  const rawStage = get("stage")
  const rawCat = get("cat")
  const rawOem = get("oem")

  const createdOn = useMemo(() => parseDateRange(rawFrom, rawTo), [rawFrom, rawTo])
  const closedOn = useMemo(() => parseDateRange(rawCFrom, rawCTo), [rawCFrom, rawCTo])
  const owners = useMemo(() => parseIdList(rawOwner), [rawOwner])
  // "" = every stage.
  const stage = parseEnum(rawStage, DEAL_STAGES)
  const categories = useMemo(() => parseIdList(rawCat), [rawCat])
  const oems = useMemo(() => parseIdList(rawOem), [rawOem])

  const debouncedSearch =
    useDebounce(search.trim(), UI.DEBOUNCE_SEARCH_MS) || undefined

  const setSearch = (next: string) => update({ q: next || null })
  const setCreatedOn = (next: DateRange | undefined) =>
    update({
      from: next?.from ? toDateParam(next.from) : null,
      to: next?.to ? toDateParam(next.to) : null,
    })
  const setClosedOn = (next: DateRange | undefined) =>
    update({
      cfrom: next?.from ? toDateParam(next.from) : null,
      cto: next?.to ? toDateParam(next.to) : null,
    })
  const setOwners = (next: string[]) => update({ owner: join(next) })
  const setStage = (next: DealStage | "") => update({ stage: next || null })
  const setCategories = (next: string[]) => update({ cat: join(next) })
  const setOems = (next: string[]) => update({ oem: join(next) })

  const hasCreated = !!createdOn?.from || !!createdOn?.to
  const hasClosed = !!closedOn?.from || !!closedOn?.to
  const hasActive =
    search.trim() !== "" ||
    hasCreated ||
    hasClosed ||
    owners.length > 0 ||
    stage !== "" ||
    categories.length > 0 ||
    oems.length > 0

  // Everything except the search text counts toward the Filters button / sidebar
  // Clear all (same as the Accounts list) — including the toolbar chips.
  const asideActiveCount = [
    hasCreated,
    hasClosed,
    stage !== "",
    owners.length > 0,
    categories.length > 0,
    oems.length > 0,
  ].filter(Boolean).length

  const FILTER_KEYS = ["from", "to", "cfrom", "cto", "owner", "stage", "cat", "oem"]
  const clearedFilters = Object.fromEntries(FILTER_KEYS.map((k) => [k, null]))
  // One navigation for every key, so nothing overwrites anything.
  const resetAside = () => update(clearedFilters)
  const clearAll = () => update({ ...clearedFilters, q: null })

  const { date_from: closed_from, date_to: closed_to } = dateRangeToParams(closedOn)
  const { date_from, date_to } = dateRangeToParams(createdOn)

  return {
    search,
    setSearch,
    owners,
    setOwners,
    categories,
    setCategories,
    oems,
    setOems,
    stage,
    setStage,
    closedOn,
    setClosedOn,
    createdOn,
    setCreatedOn,
    hasActive,
    asideActiveCount,
    resetAside,
    clearAll,
    /** Spread into the `useDeals` params. */
    queryParams: {
      number_or_title: debouncedSearch,
      owner_id: owners.length > 0 ? owners : undefined,
      category_ids: categories.length > 0 ? categories : undefined,
      oem_ids: oems.length > 0 ? oems : undefined,
      stage: stage || undefined,
      date_from,
      date_to,
      closed_from,
      closed_to,
    },
  }
}
