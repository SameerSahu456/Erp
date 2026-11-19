import { type ReplacementRequestItemWire } from "@modules/crm"
import { PAGINATION } from "@/shared/constants"

import { REPLACEMENT_REQUESTS_STRINGS as S } from "./replacement-requests.strings"

export const LIST_ROUTE = "/wms/replacements"

// Pages whole groups so bulk-approve always sees every unit of a group.
export const ITEMS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE
// expand + item + serial + generation + decision + status + substitute + actions
export const COLSPAN = 9

export type DialogState =
  | { kind: "reject"; itemId: string }
  | { kind: "rejectSelected" }
  | { kind: "waive"; itemId: string }
  | { kind: "cancel" }
  | null

/** Lines an operator can still decide, grouped so a whole group approves at once. */
/** Which row actions one line offers. An in-house swap repairs the customer's
 *  own device, so its return is never written off (RR_IN_HOUSE_RETURN_REQUIRED);
 *  a component part found fine is closed as not needed before it ships
 *  (spec D13) — both by the write-off roles — except the last open line of an
 *  in-house device, which carries the device back to the customer. The same
 *  roles switch an in-house part between repair and replace (spec D15). */
export function lineActionGates(
  item: ReplacementRequestItemWire,
  { decidable, mayWaiveReturns, mayReassign, carriesDeviceBack }: {
    decidable: boolean
    mayWaiveReturns: boolean
    mayReassign: boolean
    carriesDeviceBack: boolean
  },
) {
  const canWaive = mayWaiveReturns && isWaivable(item)
  const canMarkNotNeeded = mayWaiveReturns && isClosable(item) && !carriesDeviceBack
  const canChangeOutcome = mayWaiveReturns && isOutcomeChangeable(item)
  const pendingNotYours = item.approval_status === "pending" && !decidable
  const canReassign = mayReassign && item.approval_status === "pending"
  const hasMenu = [decidable, canWaive, canMarkNotNeeded, canChangeOutcome, pendingNotYours, canReassign].some(Boolean)
  return { canWaive, canMarkNotNeeded, canChangeOutcome, pendingNotYours, canReassign, hasMenu }
}

const isInHouse = (item: ReplacementRequestItemWire) =>
  item.target === "component" && item.swap_location === "in_house"

/** An outstanding return that may be written off — never an in-house one. */
const isWaivable = (item: ReplacementRequestItemWire) =>
  item.approval_status === "approved" && item.return_status === "pending" && !isInHouse(item)

/** An approved, unshipped component line — but not a part that came in on its
 *  own: that has to go back, so it is repaired instead (spec D15). */
function isClosable(item: ReplacementRequestItemWire): boolean {
  const partHere =
    isInHouse(item) && item.in_house_return === "part" && item.return_status === "received"
  return (
    item.approval_status === "approved" &&
    item.target === "component" &&
    item.dispatch_status === "pending" &&
    !partHere
  )
}

/** Repair ↔ replace: an in-house part, live and not yet shipped (spec D15). */
const isOutcomeChangeable = (item: ReplacementRequestItemWire) =>
  isInHouse(item) && item.approval_status !== "rejected" && item.dispatch_status === "pending"

/** True when this is the only open line of an in-house device: the device
 *  ships back to the customer on it, so it cannot be closed as not needed. */
export function carriesDeviceBack(
  item: ReplacementRequestItemWire,
  all: ReplacementRequestItemWire[],
): boolean {
  // Only a whole device ships back on a line; a part that came in on its own
  // travels on its own line (spec D15).
  if (item.target !== "component" || item.swap_location !== "in_house") return false
  if (item.in_house_return !== "device") return false
  return !all.some(
    (o) =>
      o.id !== item.id &&
      o.target === "component" &&
      o.swap_location === "in_house" &&
      o.in_house_return === "device" &&
      o.original_dispatch_request_item_id === item.original_dispatch_request_item_id &&
      o.approval_status !== "rejected" &&
      o.dispatch_status === "pending",
  )
}

export function groupKey(item: ReplacementRequestItemWire): string {
  return `${item.sales_order_item_id}:${item.original_part_variant_id}:${item.generation}`
}

/** "Part · Variant", collapsing to just the part when the variant repeats it
 *  (a single-variant part would otherwise read "Redmi-4323 · Redmi-4323"). */
export function partLabel(part?: string | null, variant?: string | null): string {
  if (!part) return variant ?? ""
  return variant && variant !== part ? `${part} · ${variant}` : part
}

const D = S.detail.dialogs

/** Per-kind dialog copy. A closed dialog (`null`) reads as "cancel", matching
 *  the fall-through the copy has always had while the dialog animates shut. */
export const DIALOG_COPY = {
  reject: {
    title: D.rejectTitle,
    reason: D.rejectReason,
    placeholder: D.rejectPlaceholder,
    confirm: D.rejectConfirm,
  },
  rejectSelected: {
    title: D.rejectSelectedTitle,
    reason: D.rejectReason,
    placeholder: D.rejectPlaceholder,
    confirm: D.rejectSelectedConfirm,
  },
  waive: {
    title: D.waiveTitle,
    reason: D.waiveReason,
    placeholder: D.waivePlaceholder,
    confirm: D.waiveConfirm,
  },
  cancel: {
    title: D.cancelTitle,
    reason: D.cancelReason,
    placeholder: D.cancelPlaceholder,
    confirm: D.cancelConfirm,
  },
} as const
