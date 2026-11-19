import { formatIST } from '@shared/lib/date'

import type { ScrapPendingPlacementListResponse } from '../../api'
import { SCRAP_PLACEMENT_QUEUE_STRINGS as S } from './scrap-placement-queue.strings'

type ScrapPendingItem = ScrapPendingPlacementListResponse['items'][number]

export const SCRAP_QUEUE_COLUMNS = [
  { key: 'serial', label: S.columns.serial, width: '11%' },
  { key: 'mfrSerial', label: S.columns.mfrSerial, width: '11%' },
  { key: 'variant', label: S.columns.variant, width: '13%' },
  { key: 'warehouse', label: S.columns.warehouse, width: '11%' },
  { key: 'scrappedBy', label: S.columns.scrappedBy, width: '11%' },
  { key: 'scrappedAt', label: S.columns.scrappedAt, width: '11%' },
  { key: 'reason', label: S.columns.reason, width: '12%' },
  // §8.7: two labelled actions (Assign Location + Un-scrap) do not fit 10%.
  // Widened out of the columns above rather than letting the row scroll.
  { key: 'actions', label: S.columns.actions, align: 'right' as const, width: '20%' },
]

/** Name lookups resolved once per page — never per row (§11). */
export interface ScrapRowLookups {
  variantLabelOf: (variantId: string) => string
  warehouseNameById: ReadonlyMap<string, string>
  displayNameById: Readonly<Record<string, string>>
}

/** One queue row in the table's cell vocabulary. */
export function toScrapQueueRow(i: ScrapPendingItem, l: ScrapRowLookups): Record<string, unknown> {
  return {
    id: i.id,
    serial: i.internal_serial,
    mfrSerial: i.manufacturer_serial ?? S.none,
    // The raw value, so the assign dialog never shows the placeholder dash.
    _mfrSerial: i.manufacturer_serial ?? '',
    variant: i.part_variant_id ? l.variantLabelOf(i.part_variant_id) : S.none,
    warehouseId: i.warehouse_id ?? '',
    warehouse: (i.warehouse_id && l.warehouseNameById.get(i.warehouse_id)) || S.none,
    // "Scrapped by" needs the user-lookup permission; without it the cell
    // shows the dash, never a raw user id (§18).
    scrappedBy: (i.scrapped_by && l.displayNameById[i.scrapped_by]) || S.none,
    scrappedAt: i.scrapped_at ? formatIST(i.scrapped_at) : S.none,
    reason: i.scrap_reason ?? S.none,
    // Hidden: lets Un-scrap compute legal targets without a fetch (D9).
    priorStatus: i.scrap_prior_status ?? '',
  }
}
