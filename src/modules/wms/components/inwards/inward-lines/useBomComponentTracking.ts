import { useEffect, useMemo } from 'react'

import { usePartsByIds } from '@modules/ims'

import type { BomComponentDraft, ManualLine } from './model'

/** Which BOM component parts are tracked, keyed by part id (the variant search
 *  result doesn't carry is_tracking). Read-only lookup. */
export function useBomComponentTracking(rows: BomComponentDraft[]) {
  const partIds = useMemo(
    () => Array.from(new Set(rows.map((c) => c.partId).filter(Boolean))),
    [rows],
  )
  const partQueries = usePartsByIds(partIds)
  const partDataSig = partQueries.map((q) => q.data?.id).join(',')
  return useMemo(() => {
    const m: Record<string, boolean> = {}
    partQueries.forEach((q, i) => {
      if (q.data) m[partIds[i]] = !!q.data.is_tracking
    })
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partIds, partDataSig])
}

/** Tracked → one serial, qty locked to 1; non-tracked → quantity only. A tracked
 *  qty-N row expands into N rows of qty 1 (each needs its own serial). Returns
 *  null when nothing changes. */
function syncComponentTracking(
  rows: BomComponentDraft[],
  trackingByPartId: Record<string, boolean>,
): BomComponentDraft[] | null {
  let changed = false
  const next: BomComponentDraft[] = []
  for (const c of rows) {
    const t = c.componentVariantId ? trackingByPartId[c.partId] : undefined
    if (t === true && c.quantity !== 1) {
      changed = true
      for (let i = 0; i < Math.max(1, c.quantity); i++) {
        next.push({ ...c, rowKey: crypto.randomUUID(), tracked: true, quantity: 1, serial: '' })
      }
    } else if (c.tracked !== t) {
      changed = true
      next.push({ ...c, tracked: t })
    } else {
      next.push(c)
    }
  }
  return changed ? next : null
}

/** Keeps every line's BOM components in step with their parts' tracking, whether
 *  or not the line's BOM panel is open. A template's "RAM ×2" on a tracked part
 *  must leave as two qty-1 entries; the backend refuses a tracked qty-2 one
 *  (QUANTITY_ON_TRACKED_COMPONENT). */
export function useBomTrackingSync(lines: ManualLine[], onChange: (next: ManualLine[]) => void) {
  const allComponents = useMemo(() => lines.flatMap((l) => l.components), [lines])
  const trackingByPartId = useBomComponentTracking(allComponents)

  useEffect(() => {
    let changed = false
    const next = lines.map((l) => {
      const synced = syncComponentTracking(l.components, trackingByPartId)
      if (!synced) return l
      changed = true
      return { ...l, components: synced }
    })
    if (changed) onChange(next)
  }, [trackingByPartId, lines, onChange])
}
