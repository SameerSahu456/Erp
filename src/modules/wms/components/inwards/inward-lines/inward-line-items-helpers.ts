import { useVariantsListInfinite } from '@modules/ims'

import { makeDescLine, type ManualLine } from './model'

export type DescBucket = { sourceId: string; description: string; pending: number }

/** Units a picked line claims against its source: one per tracked unit row,
 *  else its quantity (at least 1). */
const unitClaim = (l: { tracked: boolean; qty: number }) => (l.tracked ? 1 : Math.max(1, l.qty))

// Bind the PO's header condition into the catalog variant search (refurbished PO
// → refurbished variants only). Returns a hook AsyncSelect calls as `useOptions`.
export function makeCatalogVariantOptions(condition?: 'new' | 'refurbished') {
  return function useCatalogVariantOptions(search: string) {
    return useVariantsListInfinite(search, condition ? { condition } : undefined)
  }
}

// Running claim index per PO part row, rendered as `{claim} of {pending}`: units
// of the source line claimed up to AND INCLUDING the row, so a repeat pick shows
// `2 of 1`. A picked row claims a slot immediately (tracked before its serial).
export function claimIndexByLineKey(value: ManualLine[]): Record<string, number> {
  const claimed: Record<string, number> = {}
  const out: Record<string, number> = {}
  for (const l of value) {
    if (l.descriptionOnly || !l.sourceId) continue
    const claim = l.variantId ? unitClaim(l) : 0
    claimed[l.sourceId] = (claimed[l.sourceId] ?? 0) + claim
    out[l.key] = claimed[l.sourceId]
  }
  return out
}

// Add another row to a description bucket — slots in right after the bucket's
// existing rows so the group stays contiguous.
export function withDescRowAdded(value: ManualLine[], bucket: DescBucket): ManualLine[] {
  const fresh = makeDescLine(bucket)
  const next: ManualLine[] = []
  let inserted = false
  for (let i = 0; i < value.length; i++) {
    next.push(value[i])
    const isLastOfBucket =
      value[i].descriptionOnly &&
      value[i].sourceId === bucket.sourceId &&
      !(value[i + 1]?.descriptionOnly && value[i + 1]?.sourceId === bucket.sourceId)
    if (isLastOfBucket) {
      next.push(fresh)
      inserted = true
    }
  }
  if (!inserted) next.push(fresh)
  return next
}
