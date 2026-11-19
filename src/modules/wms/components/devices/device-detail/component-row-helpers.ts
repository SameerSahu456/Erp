import type { StatusBadgeVariant } from '@/components/common/display/StatusBadge'
import type { StockItemComponent } from '@modules/ims'

import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  WORKFLOW_LABELS,
  WORKFLOW_VARIANT,
} from '../deviceLabels'

import {
  isAddedByHand,
  isPulledOut,
  type ComponentCheckState,
} from '../../../constants/component-check-state'
import { COMPONENTS_CARD_STRINGS as S } from './components-card.strings'
import type { ComponentRowActions } from './ComponentRow'

/** Row title + serial line, each falling back to the no-serial placeholder. */
export function componentRowText(c: StockItemComponent): { label: string; serial: string } {
  const label =
    [c.part_name, c.variant_name].filter(Boolean).join(' · ') || c.part_number || S.row.noSerial
  const serial = c.internal_serial || c.manufacturer_serial || S.row.noSerial
  return { label, serial }
}

export interface ComponentRowVisibility {
  confirm: boolean
  markMissing: boolean
  foundAfterAll: boolean
  identify: boolean
  pull: boolean
  putBack: boolean
  undoAdd: boolean
}

/** Which row actions apply: each needs its handler AND a state that makes it meaningful. */
export function componentRowVisibility(
  c: StockItemComponent,
  states: readonly ComponentCheckState[],
  isRemoved: boolean,
  actions: ComponentRowActions,
): ComponentRowVisibility {
  const due = states.includes('due')
  const missing = states.includes('missing')
  const unidentified = states.includes('unidentified')
  return {
    confirm: due && !!actions.onConfirm,
    // Any part still inside can turn out not to be there — not only one
    // waiting to be checked (e.g. added at discovery, or added back by mistake).
    markMissing: !isRemoved && !!actions.onMarkMissing,
    foundAfterAll: missing && !!actions.onFoundAfterAll,
    identify: !isRemoved && unidentified && !!actions.onIdentify,
    pull: !isRemoved && !due && !unidentified && !!actions.onPull,
    // While the pulled part waits for its QC / repair (undo the pull), or once it
    // has passed QC and is back in stock (refit the same part). Scrapped, sold
    // or moved on: putting it back is refused anyway.
    putBack: isRemoved && isPulledOut(c) && canGoBackIn(c) && !!actions.onPutBack,
    undoAdd: !isRemoved && !due && isAddedByHand(c) && !!actions.onUndoAdd,
  }
}

/** Where a pulled-out part is now — its pipeline stage if it has one (Pending
 *  QC, In Repair), else its stock status (Scrapped, Available…). `null` for a
 *  row that was not pulled out. */
export function pulledPartBadge(c: StockItemComponent): { label: string; variant: StatusBadgeVariant } | null {
  if (!c.result_stock_item_id || !c.result_status) return null
  const workflow = c.result_workflow_status
  if (workflow) {
    return { label: WORKFLOW_LABELS[workflow] ?? workflow, variant: WORKFLOW_VARIANT[workflow] ?? 'neutral' }
  }
  return {
    label: DEVICE_STATUS_LABELS[c.result_status] ?? c.result_status,
    variant: DEVICE_STATUS_VARIANT[c.result_status] ?? 'neutral',
  }
}

/** Statuses from which a pulled-out part can go back into its device. */
const PUT_BACK_FROM = new Set(['in_operations', 'available'])

function canGoBackIn(c: StockItemComponent): boolean {
  return !!c.result_status && PUT_BACK_FROM.has(c.result_status)
}
