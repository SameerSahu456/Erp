import { useEffect, useMemo } from 'react'

import { usePartsByIds } from '@modules/ims'

import type { ManualLine } from './model'

/** Description-only lines don't carry the part's tracking flag — it's resolved
 *  from the part the operator picks. This resolves `is_tracking` for each picked
 *  part and reconciles the line accordingly: tracked → qty 0 (one serial per
 *  unit), non-tracked → qty ≥ 1 with no serial. Runs as an effect against the
 *  live `value` / `onChange`. */
export function useDescTrackingSync(value: ManualLine[], onChange: (next: ManualLine[]) => void) {
  const descPartIds = useMemo(
    () => Array.from(new Set(value.filter((l) => l.descriptionOnly && l.partId).map((l) => l.partId))),
    [value],
  )
  const descPartQueries = usePartsByIds(descPartIds)
  const descPartDataSig = descPartQueries.map((q) => q.data?.id).join(',')
  const descTrackingByPartId = useMemo(() => {
    const m: Record<string, boolean> = {}
    descPartQueries.forEach((q, i) => {
      if (q.data) m[descPartIds[i]] = !!q.data.is_tracking
    })
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descPartIds, descPartDataSig])

  useEffect(() => {
    let changed = false
    const next = value.map((l) => {
      if (!l.descriptionOnly || !l.partId || !(l.partId in descTrackingByPartId)) return l
      const t = descTrackingByPartId[l.partId]
      if (l.tracked === t) return l
      changed = true
      return { ...l, tracked: t, qty: t ? 0 : l.qty || 1, serial: t ? l.serial : '' }
    })
    if (changed) onChange(next)
  }, [descTrackingByPartId, value, onChange])
}
