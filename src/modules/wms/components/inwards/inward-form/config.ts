import { ArchiveRestore,
  Undo2, ArrowLeftRight, FileText, Monitor, Replace, type LucideIcon } from 'lucide-react'

import type { GrnBatchCreate, InwardType } from '../../../api'
import { INWARDS_STRINGS } from '../inwards.strings'

// §16.12 — display copy lives in inwards.strings.ts; this file keeps only the
// structural config (icons, inward types, source-entity pairing).
const CFG = INWARDS_STRINGS.formConfig

/** Per-type config for the "return-flavor" inward types (everything except
 *  purchase_order). They share the ReturnLineItems editor + buildReturnLines;
 *  only the source document, its label, and warehouse handling differ. */
export type ReturnCfg = {
  // Backend requires this exact pairing with inward_type, else INWARD_SOURCE_TYPE_MISMATCH.
  sourceEntityType: GrnBatchCreate['source_entity_type']
  noun: string // lower-case singular, used in messages ("order", "transfer", …)
  label: string // field label / Title Case ("Order", "Demo request", …)
  // Transfer inward must be received at the dispatch's destination, so the
  // warehouse is taken from the picked source row (no operator choice).
  warehouseFromRow?: boolean
}

export const RETURN_CFG: Partial<Record<InwardType, ReturnCfg>> = {
  // Changed 2026-08-17: a customer return is received against the Sales
  // Return Request that authorized it, not against the order. Sending
  // 'sales_orders' here 404s with SALES_RETURN_REQUEST_NOT_FOUND — the
  // backend no longer accepts an order as a sale_return source.
  sale_return: { sourceEntityType: 'sales_return_requests', ...CFG.returnCfg.sale_return },
  // The rental sibling: its batches name a Rental Return Request, and
  // receipt settles the rental DEVICE as well as the request's lines.
  rental_return: {
    sourceEntityType: 'rental_return_requests',
    ...CFG.returnCfg.rental_return,
  },
  demo_return: { sourceEntityType: 'demo_requests', ...CFG.returnCfg.demo_return },
  replacement_return: { sourceEntityType: 'replacement_requests', ...CFG.returnCfg.replacement_return },
  staff_return: { sourceEntityType: 'staff_requests', ...CFG.returnCfg.staff_return },
  warehouse_transfer_inward: {
    sourceEntityType: 'warehouse_transfers',
    ...CFG.returnCfg.warehouse_transfer_inward,
    warehouseFromRow: true,
  },
}

/** Top-level inward "type" cards. Most map to a single backend inward_type;
 *  "Internal Transfer" groups two (staff_return + warehouse_transfer_inward),
 *  switched via a sub-toggle in the source section. */
export type TypeGroup = {
  key: string
  label: string
  description: string
  icon: LucideIcon
  types: InwardType[] // first entry is the default when the card is picked
  /** Shown but not pickable. */
  disabled?: boolean
}

export const TYPE_GROUPS: TypeGroup[] = [
  { key: 'purchase_order', ...CFG.typeGroups.purchase_order, icon: FileText, types: ['purchase_order'] },
  { key: 'sale_return', ...CFG.typeGroups.sale_return, icon: ArchiveRestore, types: ['sale_return'] },
  { key: 'rental_return', ...CFG.typeGroups.rental_return, icon: Undo2, types: ['rental_return'] },
  { key: 'demo_return', ...CFG.typeGroups.demo_return, icon: Monitor, types: ['demo_return'] },
  { key: 'replacement_return', ...CFG.typeGroups.replacement_return, icon: Replace, types: ['replacement_return'] },
  // Frozen: Internal Transfer inwards are not raised from this form for now.
  { key: 'internal_transfer', ...CFG.typeGroups.internal_transfer, icon: ArrowLeftRight, types: ['staff_return'], disabled: true },
]

export const STEPS = [
  { id: 'details', label: CFG.steps.details },
  { id: 'lines', label: CFG.steps.lines },
] as const
