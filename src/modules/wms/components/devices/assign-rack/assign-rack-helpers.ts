import type { BinOption, RackOption, WarehouseLocationTreeNode } from '../../../api'
import { ASSIGN_RACK_DIALOG_STRINGS as S } from '../assign-rack-dialog.strings'

/** Occupancy at which the meter turns from success to warning (percent). */
const OCCUPANCY_WARN_PCT = 80

/** Where the device sits now, as a rack (+ bin) pick from the loaded tree. */
export function findPrefill(
  racks: readonly { id: string; children?: readonly { id: string }[] | null }[],
  currentLocationId: string | null | undefined,
): { rackId: string; binId: string } | null {
  if (!currentLocationId) return null
  for (const rack of racks) {
    if (rack.id === currentLocationId) return { rackId: rack.id, binId: '' }
    const bin = rack.children?.find((c) => c.id === currentLocationId)
    if (bin) return { rackId: rack.id, binId: bin.id }
  }
  return null
}

/** "3 / 50" style occupancy, or just the count when uncapped. */
export function occText(n: { current_occupancy: number; capacity?: number | null }): string {
  return n.capacity != null ? `${n.current_occupancy} / ${n.capacity}` : `${n.current_occupancy}`
}

/** Rack option occupancy: a with-bins rack shows "has bins"; a direct rack with
 *  no cap (capacity 0) shows just the count. */
export function rackOccText(r: RackOption): string {
  if (!r.can_store_stock) return S.rackHasBins
  return r.capacity > 0 ? `${r.current_occupancy} / ${r.capacity}` : `${r.current_occupancy}`
}

export const binOccText = (b: BinOption): string => occText(b)

/** Meter fill percent (capped at 100) and its token tone. */
export function occupancyMeter(node: WarehouseLocationTreeNode): { pct: number; tone: string } | null {
  if (node.capacity == null) return null
  const pct = Math.min(100, Math.round((node.current_occupancy / node.capacity) * 100))
  if (pct >= 100) return { pct, tone: 'bg-destructive' }
  return { pct, tone: pct >= OCCUPANCY_WARN_PCT ? 'bg-warning' : 'bg-success' }
}
