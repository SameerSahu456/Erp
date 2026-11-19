/** State + derivations for the replacement-request detail page (§10.1). */
import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { useAuth } from "@shared/auth/use-auth"
import { usePermission } from "@shared/rbac"
import { rentalsCan } from "@modules/rentals"
import { asUuid } from "@shared/lib/validation"
import { useClientPager } from "@/shared/hooks/useClientPager"
import {
  useApproveReplacementItem,
  useApproveReplacementItems,
  useCancelReplacementRequest,
  useRejectReplacementItem,
  useReplacementRequest,
  useWaiveReplacementReturn,
  type ReplacementRequestItemWire,
} from "@modules/crm"

import {
  ITEMS_PAGE_SIZE,
  LIST_ROUTE,
  groupKey,
  type DialogState,
} from "../../components/replacement-requests/replacement-request-detail-helpers"
import { dialogBlockReason, replacementDetailGates } from "./replacement-request-detail-gates"
import { useReplacementSelection } from "./useReplacementSelection"

export function useReplacementRequestDetail() {
  // §11.1 — the route `:id` is untrusted; a malformed one keeps the query
  // disabled instead of drawing a 422 from the API.
  const { id: rawId } = useParams<{ id: string }>()
  const id = asUuid(rawId) ?? undefined
  const navigate = useNavigate()
  const { user } = useAuth()
  const { can } = usePermission()
  // The line whose approver is being changed (Reassign dialog), and whether
  // the header edit dialog is open. Kept apart from `dialog`, which drives
  // the shared reason dialog.
  const [reassignTarget, setReassignTarget] = useState<ReplacementRequestItemWire | null>(null)
  // The component line being closed as not needed (its own dialog, spec D13).
  const [notNeededTarget, setNotNeededTarget] = useState<ReplacementRequestItemWire | null>(null)
  // The in-house part whose outcome is being changed (repair ↔ replace, D15).
  const [outcomeTarget, setOutcomeTarget] = useState<ReplacementRequestItemWire | null>(null)
  const [editing, setEditing] = useState(false)
  const query = useReplacementRequest(id)
  const rr = query.data
  const isCancelled = rr?.status === "cancelled"

  const [dialog, setDialog] = useState<DialogState>(null)
  const [reason, setReason] = useState("")
  // Which unit rows are expanded to show their full journey. Per-viewer UI
  // state, so a plain Set — not server data.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const approveOne = useApproveReplacementItem()
  const approveMany = useApproveReplacementItems()
  const rejectOne = useRejectReplacementItem()
  const waiveReturn = useWaiveReplacementReturn()
  const cancelRequest = useCancelReplacementRequest()

  const groups = useMemo(() => {
    const out = new Map<string, ReplacementRequestItemWire[]>()
    for (const item of rr?.items ?? []) {
      const key = groupKey(item)
      out.set(key, [...(out.get(key) ?? []), item])
    }
    return [...out.entries()]
  }, [rr?.items])
  // Items are embedded in the response, so client-side group paging is the §16.7 exception.
  const {
    page: safePage,
    setPage,
    pageItems: pagedGroups,
    totalPages,
  } = useClientPager(groups, ITEMS_PAGE_SIZE)

  // Absolute row number per unit (1-based, across all groups in order) so the
  // Sr No column stays stable regardless of which page a group lands on.
  const unitNo = useMemo(() => {
    const m = new Map<string, number>()
    let n = 0
    for (const [, items] of groups) for (const it of items) m.set(it.id, ++n)
    return m
  }, [groups])

  const toggleExpanded = (itemId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })

  /** Only the assigned PM may decide; disable for everyone else. */
  const canDecide = (item: ReplacementRequestItemWire): boolean => {
    // A cancelled request is closed: none of its lines can still be decided.
    if (isCancelled || item.approval_status !== "pending") return false
    // A rental order's lines are the rental manager's ONLY — the category PM
    // handles the sale vertical (approvals spec D1).
    if (rr?.is_rental_order) {
      return user?.is_superuser === true || can([...rentalsCan.decideReplacement])
    }
    if (!item.product_manager_id) return true
    return user?.is_superuser === true || item.product_manager_id === user?.id
  }

  const selection = useReplacementSelection({
    rrId: rr?.id,
    decidable: (rr?.items ?? []).filter(canDecide),
    pageDecidable: pagedGroups.flatMap(([, items]) => items).filter(canDecide),
  })

  const closeDialog = () => {
    setDialog(null)
    setReason("")
  }

  const submitDialog = async () => {
    if (!dialog || !rr) return
    if (dialog.kind === "rejectSelected") {
      // Stays open on a partial failure, so the reason is kept for a retry.
      if (!(await selection.rejectSelected(reason))) return
    } else if (dialog.kind === "reject") {
      await rejectOne.mutateAsync({ rrId: rr.id, itemId: dialog.itemId, reason })
    } else if (dialog.kind === "waive") {
      await waiveReturn.mutateAsync({ rrId: rr.id, itemId: dialog.itemId, reason })
    } else {
      await cancelRequest.mutateAsync({ rrId: rr.id, reason })
      navigate(LIST_ROUTE)
    }
    closeDialog()
  }

  const submitBlockReason = dialogBlockReason(dialog, reason)
  const submitPending =
    rejectOne.isPending || waiveReturn.isPending || cancelRequest.isPending || selection.rejecting

  return {
    query,
    rr,
    isCancelled,
    dialog,
    setDialog,
    reason,
    setReason,
    expanded,
    toggleExpanded,
    approveOne,
    approveMany,
    groups,
    pagedGroups,
    safePage,
    setPage,
    totalPages,
    unitNo,
    canDecide,
    selection,
    closeDialog,
    submitDialog,
    ...replacementDetailGates(rr, can),
    reassignTarget,
    setReassignTarget,
    notNeededTarget,
    setNotNeededTarget,
    outcomeTarget,
    setOutcomeTarget,
    editing,
    setEditing,
    submitBlockReason,
    submitPending,
    showPager: groups.length > ITEMS_PAGE_SIZE,
  }
}

export type ReplacementRequestDetailState = ReturnType<
  typeof useReplacementRequestDetail
>
