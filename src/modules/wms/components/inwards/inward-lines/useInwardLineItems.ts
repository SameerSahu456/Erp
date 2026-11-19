import { useEffect, useMemo, useRef, useState } from 'react'

import { makeStaticAsyncOptions } from '@/components/ui/async-select'

import type { POExpectedLine } from '../../../api'
import {
  collectManualLineSerials,
  duplicateSerialSet,
  lineUnitCount,
  makeLine,
  type ManualLine,
} from './model'
import { poLineToOption } from './variant-map'
import { useBulkImport } from './useBulkImport'
import { useDescBomSync } from './useDescBomSync'
import { useDescTrackingSync } from './useDescTrackingSync'
import { useBomTrackingSync } from './useBomComponentTracking'
import { type LineRowCtx } from './LineRow'
import {
  claimIndexByLineKey,
  makeCatalogVariantOptions,
  withDescRowAdded,
  type DescBucket,
} from './inward-line-items-helpers'

interface UseInwardLineItemsArgs {
  pendingLines: POExpectedLine[]
  value: ManualLine[]
  onChange: (next: ManualLine[]) => void
  condition?: 'new' | 'refurbished'
  flaggedSerials: ReadonlySet<string>
}

/** Derivations, row mutators and bulk import behind `InwardLineItems`. */
export function useInwardLineItems({
  pendingLines,
  value,
  onChange,
  condition,
  flaggedSerials,
}: UseInwardLineItemsArgs) {
  const [bomOpenKey, setBomOpenKey] = useState<string | null>(null)

  // Variant ids on this PO — flag + float them in the catalog dropdown.
  const poVariantIds = useMemo(
    () => pendingLines.map((l) => l.part_variant_id).filter((id): id is string => !!id),
    [pendingLines],
  )
  const poVariantIdSet = useMemo(() => new Set(poVariantIds), [poVariantIds])

  // PO-only option list for part-number rows (description lines use the catalog).
  const poVariantOptions = useMemo(
    () => pendingLines.filter((l) => !!l.part_variant_id).map(poLineToOption),
    [pendingLines],
  )
  const usePoVariantOptions = useMemo(
    () =>
      makeStaticAsyncOptions(poVariantOptions, (v) =>
        [
          v.part_number,
          v.part_name,
          v.name,
          v.display_title,
          v.description,
          ...(v.aliases ?? []),
        ]
          .filter(Boolean)
          .join(' '),
      ),
    [poVariantOptions],
  )
  // Full-catalog picker for description-only / off-PO lines, pre-filtered to the
  // PO's condition so a refurbished PO can't take a new variant (and vice versa).
  const useCatalogVariantOptions = useMemo(
    () => makeCatalogVariantOptions(condition),
    [condition],
  )

  // Resolve tracking for description-only lines from the picked part + reconcile.
  useDescTrackingSync(value, onChange)
  // ...and its BOM, pre-filled as the line's components.
  useDescBomSync(value, onChange)
  // Split tracked qty-N components into qty-1 rows even while the BOM panel is closed.
  useBomTrackingSync(value, onChange)

  // Description-only PO lines (buckets), keyed by source_id, + received rollup.
  const descBuckets = useMemo(
    () =>
      pendingLines
        .filter((l) => !l.part_variant_id && l.source_line_entity_id)
        .map((l) => ({
          sourceId: l.source_line_entity_id as string,
          description: l.description ?? '',
          pending: l.pending_quantity ?? 0,
        })),
    [pendingLines],
  )
  const receivedByBucket = useMemo(() => {
    const m: Record<string, number> = {}
    for (const l of value) {
      if (l.descriptionOnly && l.sourceId) m[l.sourceId] = (m[l.sourceId] ?? 0) + lineUnitCount(l)
    }
    return m
  }, [value])

  const claimIndexByKey = useMemo(() => claimIndexByLineKey(value), [value])

  const patch = (key: string, partial: Partial<ManualLine>) =>
    onChange(value.map((l) => (l.key === key ? { ...l, ...partial } : l)))
  const addLine = () => onChange([...value, makeLine()])
  const removeLine = (key: string) => onChange(value.filter((l) => l.key !== key))
  const addDescRow = (bucket: DescBucket) => onChange(withDescRowAdded(value, bucket))

  const { downloadTemplate, handleBulkFile } = useBulkImport({ pendingLines, onChange })

  // Serials (device + BOM component) entered more than once across all lines —
  // flagged inline so duplicates surface before finalize, not only on the server.
  const duplicateSerials = useMemo(
    () => duplicateSerialSet(collectManualLineSerials(value)),
    [value],
  )

  const ctx: LineRowCtx = {
    pendingLines,
    usePoVariantOptions,
    useCatalogVariantOptions,
    poVariantIds,
    poVariantIdSet,
    patch,
    removeLine,
    bomOpenKey,
    setBomOpenKey,
    duplicateSerials,
    claimIndexByKey,
    flaggedSerials,
  }

  // Landed here from a failed finalize (serial already in inventory) — bring the
  // first flagged serial field into view once its row has rendered.
  const scrolledToFlagged = useRef(false)
  useEffect(() => {
    if (scrolledToFlagged.current || flaggedSerials.size === 0) return
    const el = document.querySelector('[data-flagged-serial="true"]')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      scrolledToFlagged.current = true
    }
  }, [flaggedSerials, value])

  const flatRows = value.filter((l) => !l.descriptionOnly)

  return {
    ctx,
    descBuckets,
    receivedByBucket,
    flatRows,
    addLine,
    addDescRow,
    downloadTemplate,
    handleBulkFile,
  }
}
