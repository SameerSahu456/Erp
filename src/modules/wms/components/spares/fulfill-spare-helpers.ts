import type { StockItemListRow, VariantListItem } from '@modules/ims'

import { SPARES_STRINGS as S } from './spares.strings'

export interface FulfillSubject {
  id: string
  /** Null when the engineer raised the request by description only. */
  partVariantId: string | null
  /** What the engineer asked for in their own words, if they described it. */
  description: string | null
  partLabel: string
  requested: number
  fulfilled: number
}

export const unitLabel = (u: StockItemListRow): string =>
  `${u.serial_number}${u.variant_condition ? ` · ${u.variant_condition}` : ''}`

export const variantLabel = (v: VariantListItem): string =>
  v.display_title || v.name || v.part_name || v.part_number || S.fulfillDialogView.unnamedPart

// A serialized unit is one physical item, so treat a missing quantity as 1.
export const qtyText = (u: StockItemListRow): string =>
  u.quantity != null && `${u.quantity}` !== '' ? `${u.quantity}` : '1'

/** Why the Fulfill button is disabled (§0.9), or null. */
export function fulfillBlockReason(hasPart: boolean, chosenCount: number): string | null {
  if (!hasPart) return S.fulfillDialogView.blockedNoPart
  if (chosenCount === 0) return S.fulfillDialogView.blocked
  return null
}
