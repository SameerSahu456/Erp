import { rentalsCan } from "@modules/rentals"
import { crmPermissions, type ReplacementRequestWire } from "@modules/crm"

import { wmsCan } from "../../permissions"
import { REPLACEMENT_REQUESTS_STRINGS as S } from "../../components/replacement-requests/replacement-requests.strings"
import type { DialogState } from "../../components/replacement-requests/replacement-request-detail-helpers"

type Can = (required: string | readonly string[]) => boolean
type GateRequest = Pick<ReplacementRequestWire, "status" | "is_rental_order" | "items"> | undefined

const CLOSED_STATUSES = new Set(["rejected", "cancelled", "completed"])

// Cancel only before any unit has moved, and not once closed.
function isCancellable(rr: GateRequest): boolean {
  const anyExecuted = (rr?.items ?? []).some(
    (i) => i.dispatch_status === "dispatched" || i.return_status !== "pending",
  )
  return !(anyExecuted || CLOSED_STATUSES.has(rr?.status ?? ""))
}

/** Header-level action gates, each mirroring its endpoint's permission check. */
export function replacementDetailGates(rr: GateRequest, can: Can) {
  const manage = can([crmPermissions.MANAGE, ...wmsCan.returnsManage])
  const rental = !!rr?.is_rental_order
  return {
    // rentals:replace only reaches rental orders, the only ones such a viewer is shown.
    canCancel:
      isCancellable(rr) && (manage || (rental && can([...rentalsCan.raiseReplacement]))),
    // Editing the header — PATCH's gate; only while awaiting approval.
    canEdit:
      rr?.status === "pending_approval" && (manage || (rental && can([...rentalsCan.editReplacement]))),
    canReassign: manage || (rental && can([...rentalsCan.reassignReplacement])),
    // The rental manager may write off on a rental order only (matches the endpoint).
    canWaiveReturns:
      can([crmPermissions.RR_WAIVE_RETURN, ...wmsCan.returnsManage]) ||
      (rental && can([...rentalsCan.waiveReplacementReturn])),
  }
}

/** §0.9: reject, write-off and cancel all need a reason. */
export function dialogBlockReason(dialog: DialogState, reason: string): string | null {
  return dialog && !reason.trim() ? S.detail.dialogs.blockedReason : null
}
