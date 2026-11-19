import { useMemo, useState } from 'react'

import type { AsyncSelectOption } from '@/components/ui/async-select'
import { useStockItemsInfinite } from '@modules/ims'

import { useFulfillSpareRequest } from './useSpares'
import {
  fulfillBlockReason,
  type FulfillSubject,
} from '../../components/spares/fulfill-spare-helpers'
import { STATUS_AVAILABLE, makeVariantOptions } from './fulfillSpareOptions'
import { initialPart, isFulfillDirty, requestProgress, stockPageFacts } from './fulfill-spare-derive'

/** Fulfil-spare dialog state (§17). Remounted per request, so state seeds once per request. */
export function useFulfillSpare(request: FulfillSubject | null, warehouseId: string | null | undefined, onClose: () => void) {
  const open = request !== null
  const { remaining, partLocked } = requestProgress(request)

  // The part being issued — seeded from the engineer's pick (if any).
  const [part, setPart] = useState<AsyncSelectOption | null>(() => initialPart(request))
  // null until the store manager touches the category filter — then it wins,
  // even when cleared to "" (all parts).
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const partVariantId = part?.id

  // One slot per still-needed unit; each holds the chosen stock_item_id (or '').
  const [slots, setSlots] = useState<string[]>(() => Array(remaining).fill(''))
  // Label for each picked unit, captured on pick so the trigger renders the
  // serial even after the row scrolls off the loaded/searched pages.
  const [labelById, setLabelById] = useState<Record<string, string>>({})

  // Dialog-level count query — shares the picker's cache (same key as a slot
  // with an empty search), so it costs no extra round-trip.
  const availableQuery = useStockItemsInfinite('', {
    part_variant_id: partVariantId,
    status: STATUS_AVAILABLE,
    available_for_pick: true,
    warehouse_id: warehouseId ?? undefined,
    enabled: open && !!partVariantId,
  })
  const { inStockCount, seededCategoryId } = stockPageFacts(request, availableQuery.data)

  // Auto-select the category of the request's part so the part dropdown opens
  // already scoped — read off the stock rows fetched above (no extra request).
  const effectiveCategory = categoryId ?? seededCategoryId
  const useVariantOptions = useMemo(() => makeVariantOptions(effectiveCategory), [effectiveCategory])

  const fulfill = useFulfillSpareRequest()
  const chosen = slots.filter(Boolean)
  const blockReason = request ? fulfillBlockReason(!!partVariantId, chosen.length) : null
  const ready = !!request && blockReason === null

  const submit = () => {
    if (!request || !ready || !partVariantId) return
    fulfill.mutate(
      {
        reqId: request.id,
        body: {
          part_variant_id: partVariantId,
          fulfillments: chosen.map((id) => ({ stock_item_id: id, quantity: 1 })),
        },
      },
      { onSuccess: onClose },
    )
  }

  return {
    open,
    remaining,
    partLocked,
    part,
    // Units picked for one part are meaningless for another — clear them.
    choosePart: (next: AsyncSelectOption | null) => {
      if (next?.id === part?.id) return
      setPart(next)
      setSlots(Array(remaining).fill(''))
      setLabelById({})
    },
    partVariantId,
    effectiveCategory,
    setCategoryId,
    useVariantOptions,
    slots,
    labelFor: (id: string) => labelById[id] ?? id,
    pickSlot: (i: number, opt: AsyncSelectOption | null) => {
      setSlots((prev) => prev.map((v, idx) => (idx === i ? (opt?.id ?? '') : v)))
      if (opt) setLabelById((prev) => ({ ...prev, [opt.id]: opt.label }))
    },
    stockLoading: availableQuery.isLoading,
    inStockCount,
    chosenCount: chosen.length,
    ready,
    blockReason,
    dirty: isFulfillDirty(chosen.length, partVariantId, request),
    pending: fulfill.isPending,
    submit,
  }
}
