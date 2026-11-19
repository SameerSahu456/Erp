import type { DateRange } from '@/components/common/pickers/DateRangePicker'

import type { GrnBatchStatus, InwardType } from '../../api'
import { WMS_PAGE_SIZE } from '../../constants'
import { INWARD_PAGE_STRINGS } from './inward-list.strings'

export const inwardListColumns = [
  { key: 'batchNumber', label: INWARD_PAGE_STRINGS.columns.batchNumber, width: '16%', sortable: true },
  // Inward type is a categorical label you FILTER by, not sort by — an
  // alphabetical sort of "demo_return / sale_return / …" has no business
  // meaning, so it offers the filter only, not a sort (CP-261 #9).
  { key: 'inwardType', label: INWARD_PAGE_STRINGS.columns.inwardType, width: '14%', filterable: true },
  { key: 'category', label: INWARD_PAGE_STRINGS.columns.category, width: '18%' },
  { key: 'deviceCount', label: INWARD_PAGE_STRINGS.columns.deviceCount, width: '7%', sortable: true },
  { key: 'warehouse', label: INWARD_PAGE_STRINGS.columns.warehouse, width: '15%', sortable: true },
  { key: 'receivedBy', label: INWARD_PAGE_STRINGS.columns.receivedBy, width: '14%' },
  { key: 'receivedDate', label: INWARD_PAGE_STRINGS.columns.receivedDate, width: '8%', sortable: true },
  { key: 'status', label: INWARD_PAGE_STRINGS.columns.status, width: '8%', sortable: true },
]

// Column → API sort field; only columns the backend can sort by.
export const SORT_FIELD_MAP: Record<
  string,
  'grn_number' | 'unit_count' | 'created_at' | 'status' | 'warehouse' | 'inward_type'
> = {
  batchNumber: 'grn_number',
  inwardType: 'inward_type',
  deviceCount: 'unit_count',
  warehouse: 'warehouse',
  receivedDate: 'created_at',
  status: 'status',
}

// Status tabs above the table — server-filtered by GRN batch status:
//   open = Draft · closed = Completed · cancelled = Cancelled · (all = every status)
export type InwardTabId = 'open' | 'closed' | 'cancelled' | 'all'
export const INWARD_TABS: { id: InwardTabId; label: string; status?: GrnBatchStatus }[] = [
  { id: 'open', label: INWARD_PAGE_STRINGS.tabs.open, status: 'open' },
  { id: 'closed', label: INWARD_PAGE_STRINGS.tabs.closed, status: 'closed' },
  { id: 'cancelled', label: INWARD_PAGE_STRINGS.tabs.cancelled, status: 'cancelled' },
  { id: 'all', label: INWARD_PAGE_STRINGS.tabs.all },
]
export const INWARD_TAB_IDS = INWARD_TABS.map((t) => t.id)

// Per-tab view state, so filters on one tab never leak into another.
export type InwardTabView = {
  search: string
  inwardType: InwardType | ''
  dateRange: DateRange | undefined
  sortColumn: string | null
  sortDirection: 'asc' | 'desc' | null
  page: number
  pageSize: number
}
export const emptyInwardView = (): InwardTabView => ({
  search: '',
  inwardType: '',
  dateRange: undefined,
  sortColumn: null,
  sortDirection: null,
  page: 1,
  pageSize: WMS_PAGE_SIZE,
})
// sessionStorage round-trips Date → ISO string, so rebuild Date objects on read
// (the picker + `dateRangeToParams` both need real Dates).
export function reviveRange(
  r: { from?: string | Date; to?: string | Date } | undefined,
): DateRange | undefined {
  if (!r) return undefined
  const from = r.from ? new Date(r.from) : undefined
  const to = r.to ? new Date(r.to) : undefined
  if (!from && !to) return undefined
  return { from, to }
}
