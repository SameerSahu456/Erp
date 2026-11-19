import { type AsyncSelectOption } from '@/components/ui/async-select'
import { type DateRange } from '@/components/common/pickers/DateRangePicker'
import { istDayEndISO, istDayStartISO } from '@shared/lib/date'

import type { WorkAssignmentListParams } from '../../api/work-assignments'

/** One tab's filters; `issuedToName` lets the chip show the name without a lookup. */
export type WaFilters = {
  stage: string
  issuedToUserId: string
  issuedToName: string
  dateRange: DateRange | undefined
}

// IST day bounds — startOfDay() would use the browser zone.
function issuedBounds(range: DateRange | undefined) {
  return {
    issued_from: range?.from ? istDayStartISO(range.from) : undefined,
    issued_to: range?.to ? istDayEndISO(range.to) : undefined,
  }
}

interface ListParamsInput {
  tabId: string
  view: { search?: string; filters?: WaFilters } | undefined
  /** The active tab's debounced search; null for an inactive tab (uses its stored search). */
  activeSearch: string | null
  warehouseIds: string[]
}

/** One tab's list-query params, built from that tab's own stored view. */
export function waListParams({ tabId, view, activeSearch, warehouseIds }: ListParamsInput): WorkAssignmentListParams {
  const f = view?.filters
  const q = activeSearch ?? (view?.search ?? '').trim()
  return {
    status: tabId === 'all' ? undefined : tabId,
    stage: (f?.stage as WorkAssignmentListParams['stage']) || undefined,
    issued_to_user_id: f?.issuedToUserId || undefined,
    warehouse_ids: warehouseIds,
    q: q || undefined,
    ...issuedBounds(f?.dateRange),
  }
}

/** The engineer filter's selected option; the chip label rides on the stored name. */
export function engineerOption(userId: string, name: string): AsyncSelectOption | null {
  return userId ? { id: userId, label: name || userId } : null
}

/** A count query's total, 0 until it lands. */
export function totalOf(query: { data?: { total?: number } }): number {
  return query.data?.total ?? 0
}
