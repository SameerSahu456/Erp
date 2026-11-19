import { useEffect, useMemo } from 'react'

import { usePartsByIds, type VariantListItem } from '@modules/ims'

import {
  makeLine,
  type ManualReceiveLine,
  type ManualReceiveState,
} from './manual-receive-lines-helpers'
import { duplicateSerialSet } from './inward-lines/model'

/** Row mutators + part-tracking resolution behind `ManualReceiveLines`. */
export function useManualReceiveLines(
  value: ManualReceiveState,
  onChange: (next: ManualReceiveState) => void,
) {
  const patch = (key: string, partial: Partial<ManualReceiveLine>) =>
    onChange(value.map((l) => (l.key === key ? { ...l, ...partial } : l)))
  const addLine = () => onChange([...value, makeLine()])
  const removeLine = (key: string) => onChange(value.filter((l) => l.key !== key))

  // Resolve each picked variant's tracking from its part (the catalog search
  // result doesn't carry is_tracking).
  const partIds = useMemo(
    () => Array.from(new Set(value.map((l) => l.partId).filter(Boolean))),
    [value],
  )
  const partQueries = usePartsByIds(partIds)
  // Stable key over the resolved part ids so the memo recomputes as queries land.
  const partDataKey = partQueries.map((q) => q.data?.id).join(',')
  const trackingByPartId = useMemo(() => {
    const m: Record<string, boolean> = {}
    partQueries.forEach((q, i) => {
      if (q.data) m[partIds[i]] = !!q.data.is_tracking
    })
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partIds, partDataKey])

  // Stamp `tracked` on each line once its part resolves.
  useEffect(() => {
    let changed = false
    const next = value.map((l) => {
      const t = l.variantId ? trackingByPartId[l.partId] : undefined
      if (t !== undefined && l.tracked !== t) {
        changed = true
        return { ...l, tracked: t }
      }
      return l
    })
    if (changed) onChange(next)
  }, [trackingByPartId, value, onChange])

  const pick = (line: ManualReceiveLine, item: VariantListItem) =>
    patch(line.key, {
      variantId: item.id,
      partId: item.part_id,
      label: item.display_title || `${item.part_number} · ${item.name}`,
      tracked: trackingByPartId[item.part_id],
      serial: '',
      qty: 1,
    })

  // Serials entered more than once ANYWHERE on the form (regardless of part
  // number) — flagged inline so a duplicate surfaces before finalize.
  const duplicateSerials = useMemo(
    () => duplicateSerialSet(value.map((l) => l.serial)),
    [value],
  )

  return { patch, addLine, removeLine, trackingByPartId, pick, duplicateSerials }
}
