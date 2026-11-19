import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import { useAuth } from "@shared/auth/use-auth"
import { asUuid } from "@shared/lib/validation"
import { usePermission } from "@shared/rbac"
import { rentalsCan } from "@modules/rentals"
import {
  crmPermissions,
  useCancelRentalReturnRequest,
  useCloseShortRentalReturnRequest,
  useDecideRentalReturnRequestItems,
  useRentalReturnRequest,
  type RentalReturnRequestItemWire,
} from "@modules/crm"

import {
  isClosable,
  outstandingOf,
} from "../../components/rental-return-requests/rental-return-request-detail-helpers"

/** What the close-short dialog is closing: the whole request, or one line. */
export type CloseShortTarget = { kind: "request" } | { kind: "line"; item: RentalReturnRequestItemWire }

const CANCELLABLE = new Set(["pending_approval", "partially_approved", "approved"])

/**
 * Only the rental manager (`rentals:return_approve`) decides a rental return
 * line — including one they raised (approvals spec D1, D2). Only early lines
 * wait; the rest were approved as they were raised. Disabled rather than
 * discovered: the server answers 403 to anyone else.
 */
function useCanDecide() {
  const { user } = useAuth()
  const { can } = usePermission()
  const isRentalManager = can([...rentalsCan.decideReturn]) || user?.is_superuser === true
  return (item: RentalReturnRequestItemWire): boolean =>
    isRentalManager && item.approval_status === "pending"
}

export function useRentalReturnDetail() {
  // §11.1: a malformed :id never reaches the API — the query stays disabled
  // and the page renders not-found.
  const id = asUuid(useParams<{ id: string }>().id)
  const { can } = usePermission()
  const canDecide = useCanDecide()
  const detailQuery = useRentalReturnRequest(id)
  const decideMutation = useDecideRentalReturnRequestItems()
  const cancelMutation = useCancelRentalReturnRequest()
  const closeShortMutation = useCloseShortRentalReturnRequest()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [closeTarget, setCloseTarget] = useState<CloseShortTarget | null>(null)

  const rret = detailQuery.data
  const items = useMemo(() => rret?.items ?? [], [rret?.items])
  const selectedDecidable = items.filter((i) => canDecide(i) && selectedIds.has(i.id))
  const outstanding = items.reduce((sum, i) => sum + outstandingOf(i), 0)
  // Cancel is refused once anything is physically back (409
  // RRET_ALREADY_RECEIVED); close short is the way out from there.
  const anyReceived = items.some((i) => i.received_quantity > 0)
  // Cancel, logistics and close short all take crm:manage OR the rental
  // manager's decide code — whoever decides a return runs it to the end
  // (RBAC audit 2026-10-30).
  const canManage = can([crmPermissions.MANAGE, ...rentalsCan.decideReturn])
  const mayCancel = canManage

  const toggle = (itemId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })

  const decide = async (decision: "approved" | "rejected", rejectionReason?: string) => {
    if (!rret) return
    // One batch call, not N — the header status is a rollup.
    await decideMutation.mutateAsync({
      rretId: rret.id,
      body: {
        decisions: selectedDecidable.map((i) => ({
          item_id: i.id,
          decision,
          rejection_reason: rejectionReason,
        })),
      },
    })
    setSelectedIds(new Set())
  }

  const cancel = async (cancelReason: string) => {
    if (rret) await cancelMutation.mutateAsync({ rretId: rret.id, cancelReason })
  }

  const closeShort = async (reason: string) => {
    if (!rret || !closeTarget) return
    const itemId = closeTarget.kind === "line" ? closeTarget.item.id : undefined
    await closeShortMutation.mutateAsync({ rretId: rret.id, itemId, reason })
    setCloseTarget(null)
  }

  return {
    detailQuery,
    rret,
    items,
    canDecide,
    selectedIds,
    selectedDecidable,
    toggle,
    decide,
    deciding: decideMutation.isPending,
    canCancel: mayCancel && !!rret && !anyReceived && CANCELLABLE.has(rret.status),
    // PATCH (logistics): the same two codes.
    canEditLogistics: canManage,
    cancel,
    cancelling: cancelMutation.isPending,
    outstanding,
    canCloseShort: canManage && items.some(isClosable),
    canCloseLine: (item: RentalReturnRequestItemWire) => canManage && isClosable(item),
    closeTarget,
    setCloseTarget,
    closeShort,
    closingShort: closeShortMutation.isPending,
  }
}

export type RentalReturnDetailState = ReturnType<typeof useRentalReturnDetail>
