import { isWorkflowStatus } from '../../constants/device-workflow-status'

/** The server-side filters the device-queue pages share. */
export type DeviceQueueFilters = {
  assignee_id: string
  batch_id: string
  category_id: string
  variant_id: string
  /** The Status column's filter: a pipeline stage (`workflow_status`) or a
   *  stock status (`stock_items.status`) — whatever the column can show.
   *  Without it there was no way to narrow to a status at all: a scrapped
   *  device appeared under "All" and nowhere else, and "how much dead stock do
   *  we hold?" had no screen that could ask it (device-scrap D4). */
  device_status: string
  /** QC grade (A/B) from the device's newest completed QC op. */
  qc_grade: string
}
export const emptyDeviceQueueFilters = (): DeviceQueueFilters => ({
  assignee_id: '',
  batch_id: '',
  category_id: '',
  variant_id: '',
  device_status: '',
  qc_grade: '',
})

/** Which shared filter control a table column hosts. */
export type DeviceQueueFilterKind =
  | 'category'
  | 'engineer'
  | 'batch'
  | 'variant'
  | 'deviceStatus'
  | 'grade'

/** Device-queue filter constants: the "no filter" sentinel and a shared h-10 trigger class. */
export const DEVICE_QUEUE_FILTER = {
  /** BusinessMetricsTable's "All" value for a column filter. */
  ALL: '__all__',
  /** Status-filter value that narrows to devices whose components still wait
   *  to be checked (inward-verification D8) — sent as components_unchecked. */
  UNCHECKED_COMPONENTS: '__components_unchecked__',
  /** Fixed-width slot wrapping each filter in the toolbar. */
  SLOT_CLASS: 'w-[190px]',
  /** Trigger styling — mirrors the form `SelectTrigger` (rounded-[7px] / px-[10px]). */
  CONTROL_CLASS: 'h-10 w-full rounded-[7px] border-input bg-card px-[10px] shadow-xs',
} as const

/** One Status pick → API params: a pipeline stage goes out as `workflow_status`,
 *  a stock status as `device_status` (the API takes lists). `workflow_status` is
 *  only present when set, so it never blanks a tab's own stage pin. */
function statusParams(status: string) {
  if (!status) return { device_status: undefined }
  if (status === DEVICE_QUEUE_FILTER.UNCHECKED_COMPONENTS) {
    return { device_status: undefined, components_unchecked: true }
  }
  return isWorkflowStatus(status)
    ? { workflow_status: [status], device_status: undefined }
    : { device_status: [status] }
}

/** Filter state → the query params it adds to a device-queue page's list call. */
function toQueueParams(f: DeviceQueueFilters) {
  return {
    assignee_id: f.assignee_id || undefined,
    batch_id: f.batch_id || undefined,
    category_id: f.category_id || undefined,
    variant_id: f.variant_id || undefined,
    ...statusParams(f.device_status),
    qc_grade: f.qc_grade ? [f.qc_grade] : undefined,
  }
}

/** Server-side filter state → query params for device-queue pages; render via `<DeviceQueueFilter>`. */
export function useDeviceQueueControls(config: {
  engineerColumnKey?: string
  variantColumnKey?: string
  /** The active tab's filter values. */
  value: DeviceQueueFilters
  /** Patch the active tab's filters. */
  onChange: (patch: Partial<DeviceQueueFilters>) => void
}) {
  const { engineerColumnKey: engineerColKey, variantColumnKey: variantColKey, value, onChange } =
    config
  const {
    assignee_id: assigneeFilter,
    batch_id: batchFilter,
    category_id: categoryFilter,
    variant_id: variantFilter,
    device_status: deviceStatusFilter,
    qc_grade: gradeFilter,
  } = value

  /** Spread into the page's `useDevices(...)` params. */
  const params = toQueueParams(value)

  /** Current filter values keyed by column (for `serverPagination.filters`). */
  const filters: Record<string, string> = {
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...(engineerColKey && assigneeFilter ? { [engineerColKey]: assigneeFilter } : {}),
    ...(batchFilter ? { batch: batchFilter } : {}),
    ...(variantColKey && variantFilter ? { [variantColKey]: variantFilter } : {}),
    ...(deviceStatusFilter ? { status: deviceStatusFilter } : {}),
    ...(gradeFilter ? { grade: gradeFilter } : {}),
  }
  const onFiltersChange = (next: Record<string, string>) => {
    const clean = (v?: string) => (v && v !== DEVICE_QUEUE_FILTER.ALL ? v : '')
    onChange({
      category_id: clean(next.category),
      ...(engineerColKey ? { assignee_id: clean(next[engineerColKey]) } : {}),
      batch_id: clean(next.batch),
      ...(variantColKey ? { variant_id: clean(next[variantColKey]) } : {}),
      device_status: clean(next.status),
      qc_grade: clean(next.grade),
    })
  }
  const clearFilters = () => onChange(emptyDeviceQueueFilters())

  /** The shared control a column hosts, or null for a column this hook doesn't own. */
  const filterKindFor = (columnKey: string): DeviceQueueFilterKind | null => {
    if (columnKey === 'category') return 'category'
    if (columnKey === 'batch') return 'batch'
    if (engineerColKey && columnKey === engineerColKey) return 'engineer'
    if (variantColKey && columnKey === variantColKey) return 'variant'
    if (columnKey === 'status') return 'deviceStatus'
    if (columnKey === 'grade') return 'grade'
    return null
  }

  return { params, filters, onFiltersChange, clearFilters, filterKindFor }
}
