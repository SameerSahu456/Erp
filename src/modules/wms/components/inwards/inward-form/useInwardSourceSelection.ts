import { useMemo, useState } from 'react'

import { makeStaticAsyncOptions } from '@/components/ui/async-select'

import { useInwardSources } from '../../../hooks/inwards/useInwards'
import { useWarehouseScope } from '../../../context/warehouse-scope'
import type {
  ExpectedLegacyUnit,
  ExpectedReturnLine,
  InwardSourceRow,
  POExpectedLine,
  POInwardSourceRow,
} from '../../../api'
import type { InwardFormFields } from './useInwardFormFields'
import type { OwedPart } from '../replacement-parts/replacement-part-lines'

// Searchable source-picker option types — the source row plus the `id` the
// AsyncSelect value/onItemPick contract expects.
export type PoOption = POInwardSourceRow & { id: string }
export type ReturnOption = InwardSourceRow & { id: string }

/** Receivable sources for the chosen inward type, the searchable pickers over
 *  them, and the picked source's expected / returnable lines. */
export function useInwardSourceSelection(
  fields: Pick<
    InwardFormFields,
    'inwardType' | 'origin' | 'isEdit' | 'poId' | 'setPoId' | 'setLines'
  > & { isReturn: boolean },
) {
  const { inwardType, origin, isEdit, poId, setPoId, setLines, isReturn } = fields

  // PO inward: only POs whose condition matches the chosen origin.
  const sourcesQuery = useInwardSources({
    inward_type: inwardType,
    ...(isReturn ? {} : { condition: origin }),
  })
  const sources = useMemo(() => sourcesQuery.data ?? [], [sourcesQuery.data])
  const selectedSource = sources.find((s) => s.source_entity_id === poId)
  const selectedPo = isReturn ? undefined : (selectedSource as POInwardSourceRow | undefined)
  const selectedReturn = isReturn ? (selectedSource as InwardSourceRow | undefined) : undefined

  // Return sources are already scoped server-side.
  const returnSources = sources

  // PO options are limited to the navbar warehouses (union); none selected = all.
  const { selectedWarehouseIds } = useWarehouseScope()
  const poOptions = useMemo<PoOption[]>(
    () =>
      (sources as POInwardSourceRow[])
        .filter(
          (p) => selectedWarehouseIds.length === 0 || selectedWarehouseIds.includes(p.warehouse_id),
        )
        .map((p) => ({ ...p, id: p.source_entity_id })),
    [sources, selectedWarehouseIds],
  )

  // A warehouse switch may drop the picked PO, so clear it (create + PO flow only).
  const whKey = selectedWarehouseIds.join(',')
  const [prevWhKey, setPrevWhKey] = useState(whKey)
  if (prevWhKey !== whKey) {
    setPrevWhKey(whKey)
    if (!isEdit && !isReturn && poId) {
      setPoId('')
      setLines([])
    }
  }
  const usePoOptions = useMemo(
    () =>
      makeStaticAsyncOptions(
        poOptions,
        // Number, vendor or a part on it.
        (o) => [o.display_number, o.supplier_name, o.parts_summary].filter(Boolean).join(' '),
      ),
    [poOptions],
  )
  const returnOptions = useMemo<ReturnOption[]>(
    () =>
      returnSources.map((s) => {
        const r = s as InwardSourceRow
        return { ...r, id: r.source_entity_id }
      }),
    [returnSources],
  )
  const useReturnOptions = useMemo(
    () =>
      makeStaticAsyncOptions(
        returnOptions,
        // Number, customer or employee — whichever the operator remembers.
        (o) => [o.display_number, o.account_name, o.employee_name].filter(Boolean).join(' '),
      ),
    [returnOptions],
  )

  const detailQuery = useInwardSources(
    { inward_type: inwardType, source_entity_id: poId },
    !!poId,
  )
  const expectedLines = useMemo<POExpectedLine[]>(() => {
    if (isReturn) return []
    const rows = (detailQuery.data ?? []) as POInwardSourceRow[]
    return (rows[0]?.lines ?? []) as POExpectedLine[]
  }, [detailQuery.data, isReturn])
  // Only lines that still have something pending to receive.
  const receivableLines = useMemo(
    () => expectedLines.filter((l) => (l.pending_quantity ?? 0) > 0),
    [expectedLines],
  )
  // Return flow: the dispatched units pending return on the picked source.
  const returnLines = useMemo<ExpectedReturnLine[]>(() => {
    if (!isReturn) return []
    const rows = (detailQuery.data ?? []) as InwardSourceRow[]
    return (rows[0]?.lines ?? []) as ExpectedReturnLine[]
  }, [detailQuery.data, isReturn])
  // Replacement and rental returns: migrated units owed back, received by serial.
  const legacyUnits = useMemo<ExpectedLegacyUnit[]>(() => {
    if (!isReturn) return []
    const rows = (detailQuery.data ?? []) as InwardSourceRow[]
    return rows[0]?.legacy_units ?? []
  }, [detailQuery.data, isReturn])

  // Replacement return: faulty parts that may come back on their own (spec D10, D15).
  const expectedParts = useMemo<OwedPart[]>(() => {
    if (!isReturn) return []
    const rows = (detailQuery.data ?? []) as InwardSourceRow[]
    return rows[0]?.expected_replacement_parts ?? []
  }, [detailQuery.data, isReturn])

  return {
    sourcesQuery,
    sources,
    selectedSource,
    selectedPo,
    selectedReturn,
    returnSources,
    usePoOptions,
    useReturnOptions,
    detailQuery,
    receivableLines,
    returnLines,
    legacyUnits,
    expectedParts,
  }
}
