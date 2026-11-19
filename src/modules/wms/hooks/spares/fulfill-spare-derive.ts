import type { AsyncSelectOption } from '@/components/ui/async-select'

import type { FulfillSubject } from '../../components/spares/fulfill-spare-helpers'

/** Units still owed, and whether the part is locked (some already issued against it). */
export function requestProgress(request: FulfillSubject | null) {
  return {
    remaining: request ? Math.max(0, request.requested - request.fulfilled) : 0,
    partLocked: !!request && request.fulfilled > 0 && request.partVariantId !== null,
  }
}

/** The engineer's own pick (if any) seeds the part selector. */
export function initialPart(request: FulfillSubject | null): AsyncSelectOption | null {
  return request?.partVariantId ? { id: request.partVariantId, label: request.partLabel } : null
}

type StockPages = { pages: { total?: number; items: { category_id?: string | null }[] }[] } | undefined

/** In-stock count + the request part's category, both read off the first stock page. */
export function stockPageFacts(request: FulfillSubject | null, data: StockPages) {
  const first = data?.pages[0]
  return {
    inStockCount: first?.total ?? 0,
    seededCategoryId: request?.partVariantId ? (first?.items[0]?.category_id ?? '') : '',
  }
}

/** A picked unit or a changed part makes the modal dirty. */
export function isFulfillDirty(
  chosenCount: number,
  partVariantId: string | undefined,
  request: FulfillSubject | null,
): boolean {
  return chosenCount > 0 || (partVariantId ?? null) !== (request?.partVariantId ?? null)
}
