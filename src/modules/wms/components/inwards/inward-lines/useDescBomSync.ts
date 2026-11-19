import { useEffect, useMemo } from 'react'

import { useVariantsWithBomByIds } from '@modules/ims'

import { componentsFromTemplate, type BomLine, type ManualLine } from './model'

/** Description-only PO lines carry no BOM — the PO line has no part. Once the
 *  operator picks a part, this loads that part's Reference BOM and pre-fills the
 *  line's components, the same as a part-number PO line (inward-verification
 *  D1). Fills a line once: after that its `bom` is set, so a later "Clear" by
 *  the operator is kept. Runs as an effect against the live `value` / `onChange`. */
export function useDescBomSync(value: ManualLine[], onChange: (next: ManualLine[]) => void) {
  const variantIds = useMemo(
    () =>
      Array.from(
        new Set(
          value
            .filter((l) => l.descriptionOnly && l.variantId && l.bom.length === 0)
            .map((l) => l.variantId as string),
        ),
      ),
    [value],
  )
  const queries = useVariantsWithBomByIds(variantIds)
  const dataSig = queries.map((q) => q.data?.bom?.id ?? (q.data ? '-' : '')).join(',')
  const bomByVariantId = useMemo(() => {
    const m: Record<string, BomLine[]> = {}
    queries.forEach((q, i) => {
      const items = q.data?.bom?.items ?? []
      if (items.length === 0) return
      m[variantIds[i]] = items.map((it) => ({
        component_variant_id: it.component_variant_id,
        part_id: it.component_variant.part_id,
        part_name: it.component_variant.part_name,
        variant_name: it.component_variant.name,
        variant_sku_code: it.component_variant.sku_code,
        variant_condition: it.component_variant.condition,
        quantity: it.quantity,
        position: it.position,
      }))
    })
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantIds, dataSig])

  useEffect(() => {
    let changed = false
    const next = value.map((l) => {
      if (!l.descriptionOnly || !l.variantId || l.bom.length > 0) return l
      const bom = bomByVariantId[l.variantId]
      if (!bom) return l
      changed = true
      // A BOM can only exist on a BOM-eligible category, so the line is one.
      return {
        ...l,
        bomEligible: true,
        bom,
        components: l.components.length === 0 ? componentsFromTemplate(bom) : l.components,
      }
    })
    if (changed) onChange(next)
  }, [bomByVariantId, value, onChange])
}
