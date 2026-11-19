import { formatIST_date } from '@shared/lib/date'

import type { SpareRequestListResponse, SparesInventoryPage } from '../../api'
import type { SpareTab } from '../../hooks/spares/useSparesList'
import { SPARES_STRINGS } from './spares.strings'

export const requestColumns = [
  // `barcode` is the DEVICE the spare was raised for; `issuedUnit` is the spare
  // unit(s) actually handed to it — the other end of the same transaction.
  // The device the spare was raised for — a reference, not a label to print, so
  // no printer button here.
  { key: 'barcode', label: SPARES_STRINGS.bodyView.requestColumns.device, width: '9%', noBarcodePrint: true },
  { key: 'partNo', label: SPARES_STRINGS.bodyView.requestColumns.part, sortable: true, width: '11%' },
  { key: 'variant', label: SPARES_STRINGS.bodyView.requestColumns.variant, sortable: true, filterable: true, width: '11%' },
  { key: 'category', label: SPARES_STRINGS.bodyView.requestColumns.category, sortable: true, filterable: true, width: '8%' },
  { key: 'issuedUnit', label: SPARES_STRINGS.bodyView.requestColumns.issuedUnit, width: '12%' },
  { key: 'status', label: SPARES_STRINGS.bodyView.requestColumns.status, width: '9%' },
  { key: 'requestedBy', label: SPARES_STRINGS.bodyView.requestColumns.requestedBy, width: '8%' },
  { key: 'date', label: SPARES_STRINGS.bodyView.requestColumns.requestedOn, sortable: true, width: '7%' },
  { key: 'actions', label: SPARES_STRINGS.bodyView.requestColumns.actions, align: 'right' as const, width: '9%' },
]

// Table column → backend `sort` field (server-side; every sort is an API call).
export const SORT_FIELD_MAP: Record<string, string> = {
  partNo: 'part_number',
  variant: 'variant',
  category: 'category',
  date: 'requested_at',
}

export const inventoryColumns = [
  { key: 'partNo', label: SPARES_STRINGS.bodyView.inventoryColumns.part, sortable: true, width: '26%' },
  { key: 'variant', label: SPARES_STRINGS.bodyView.inventoryColumns.variant, sortable: true, width: '30%' },
  { key: 'category', label: SPARES_STRINGS.bodyView.inventoryColumns.category, width: '24%' },
  { key: 'available', label: SPARES_STRINGS.bodyView.inventoryColumns.available, sortable: true, align: 'right' as const, width: '20%' },
]

/** Tab → its empty-list description (a lookup, not a nested ternary — §14.5). */
export const SPARE_TAB_EMPTY_DESCRIPTION: Record<SpareTab, string> = {
  pending: SPARES_STRINGS.bodyView.requestsEmpty.defaultDescription,
  fulfilled: SPARES_STRINGS.bodyView.requestsEmpty.fulfilledEmptyDescription,
  returned: SPARES_STRINGS.bodyView.requestsEmpty.defaultDescription,
  cancelled: SPARES_STRINGS.bodyView.requestsEmpty.cancelledEmptyDescription,
}

type SpareRequestItem = SpareRequestListResponse['items'][number]
type SpareInventoryItem = SparesInventoryPage['items'][number]

// Rows carry variant/part/category labels inline; no extra lookups.
function labelFor(row: {
  part_number?: string | null
  sku_code?: string | null
  part_name?: string | null
  part_variant_name?: string | null
  category_name?: string | null
}) {
  return {
    // Friendly part name up front; the real SKU code rides underneath in mono.
    partNo: row.part_name || row.part_number || row.sku_code || '—',
    sku: row.sku_code || '',
    variant: row.part_variant_name || '—',
    category: row.category_name ?? '—',
  }
}

/** True while any issued unit is still loose (consumed), i.e. not yet fitted
 *  into the device. A unit with no status (older API) counts as loose so the
 *  buttons never vanish against an older backend. */
export const hasLooseUnit = (units: { status?: string | null }[] | undefined) =>
  (units ?? []).some((u) => !u.status || u.status === 'consumed')

/** One spare-request table row. A request raised by description has no part
 *  yet: the engineer's words stand in for the part, and the variant column says
 *  the store manager still has to choose it. */
export function toSpareRequestRow(r: SpareRequestItem) {
  const l = labelFor(r)
  const partChosen = r.part_variant_id !== null
  return {
    id: r.id,
    stockItemId: r.stock_item_id,
    warehouseId: r.warehouse_id ?? null,
    partVariantId: r.part_variant_id,
    description: r.description ?? null,
    barcode: r.barcode || '—',
    partNo: partChosen ? l.partNo : (r.description ?? '—'),
    sku: partChosen ? l.sku : '',
    variant: partChosen ? l.variant : SPARES_STRINGS.requestTable.partToBeChosen,
    category: l.category,
    requested: r.quantity_requested,
    fulfilled: r.quantity_fulfilled,
    returned: r.quantity_returned,
    issuedUnits: r.fulfilled_units ?? [],
    status: r.status,
    requestedBy: r.requested_by_name || '—',
    requestedById: r.requested_by,
    date: r.requested_at ? formatIST_date(r.requested_at) : '—',
  }
}

/** One spare-inventory table row. */
export function toSpareInventoryRow(i: SpareInventoryItem) {
  const l = labelFor(i)
  return {
    id: i.part_variant_id,
    partNo: l.partNo,
    sku: l.sku,
    variant: l.variant,
    category: l.category,
    available: i.available_count,
  }
}
