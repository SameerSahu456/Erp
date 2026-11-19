import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import { PAGINATION } from "@/shared/constants"
import { todayDateParam } from "@shared/lib/date"
import { useAuth } from "@shared/auth/use-auth"
import { usePermission } from "@shared/rbac"
import { asUuid } from "@shared/lib/validation"
import { useClientPager } from "@/shared/hooks/useClientPager"
import {
  useCancelSalesReturnRequest,
  useDecideSalesReturnRequestItems,
  usePatchSalesReturnRequest,
  useSalesReturnRequest,
  type SalesReturnRequestItemWire,
} from "@modules/crm"

import { wmsCan } from "../../permissions"
import { salesReturnHeaderGates } from "./sales-return-detail-helpers"
import { useSalesReturnLogistics } from "./useSalesReturnLogistics"
import { SALES_RETURN_REQUESTS_STRINGS as S } from "../../components/sales-return-requests/sales-return-requests.strings"

// Single-source page size for the embedded units table (§16.6).
export const ITEMS_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE

/** State + derivations for the sales-return request detail page. */
export function useSalesReturnRequestDetail() {
  // §11.1 — the route `:id` is untrusted; a malformed one keeps the query
  // disabled instead of drawing a 422 from the API.
  const { id: rawId } = useParams<{ id: string }>()
  const id = asUuid(rawId) ?? undefined
  const { user } = useAuth()

  const detailQuery = useSalesReturnRequest(id)
  const decideMutation = useDecideSalesReturnRequestItems()
  const cancelMutation = useCancelSalesReturnRequest()
  const patchMutation = usePatchSalesReturnRequest()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  const sret = detailQuery.data
  const logistics = useSalesReturnLogistics(sret, patchMutation)
  // Arrival can't be in the past (§9). Local day, not UTC (UTC lags IST until 05:30).
  const today = todayDateParam()

  const items = useMemo(() => sret?.items ?? [], [sret?.items])
  // Units come embedded in the detail response, so client paging is the §16.7 exception.
  const {
    page: currentItemsPage,
    setPage: setItemsPage,
    pageItems: visibleItems,
    totalPages: totalItemPages,
  } = useClientPager(items, ITEMS_PAGE_SIZE)

  /**
   * Only the assigned PM may decide (403 SRET_NOT_ITEM_APPROVER). A line with no
   * PM is decidable by anyone with the permission, so it never strands the request.
   */
  const canDecide = (item: SalesReturnRequestItemWire): boolean => {
    if (item.approval_status !== "pending") return false
    if (item.product_manager_id == null) return true
    return user?.is_superuser === true || item.product_manager_id === user?.id
  }

  const decidableItems = items.filter(canDecide)
  const selectedDecidable = decidableItems.filter((i) => selectedIds.has(i.id))
  // A header select-all that toggles every decidable line at once (across
  // pages) — the units set is bounded by one order, so "all" means all.
  const allDecidableSelected =
    decidableItems.length > 0 &&
    decidableItems.every((i) => selectedIds.has(i.id))

  const { canCancel, isCancelled, isTerminal, hideSelection, logisticsEditable } =
    salesReturnHeaderGates(sret, items)
  // Only WMS returns users (`wms:returns_*`) edit logistics; CRM raisers see it read-only.
  const isWarehouseUser = usePermission().can(wmsCan.returnsView)

  const toggle = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const toggleAllDecidable = () => {
    setSelectedIds(
      allDecidableSelected
        ? new Set()
        : new Set(decidableItems.map((i) => i.id)),
    )
  }

  // Row actions narrow the selection to that line and reuse the bulk dialog.
  const approveRow = (item: SalesReturnRequestItemWire) => {
    setSelectedIds(new Set([item.id]))
    setApproveOpen(true)
  }
  const rejectRow = (item: SalesReturnRequestItemWire) => {
    setSelectedIds(new Set([item.id]))
    setRejectOpen(true)
  }

  // The action handlers below only run from the loaded page, so `sret` is
  // always present when they fire; the guard just narrows the type.
  const approveSelected = async () => {
    if (!sret) return
    await decideMutation.mutateAsync({
      sretId: sret.id,
      // One batch call: a half-applied batch would skew the header rollup.
      body: {
        decisions: selectedDecidable.map((i) => ({
          item_id: i.id,
          decision: "approved",
        })),
      },
    })
    setSelectedIds(new Set())
    // Close the confirm modal once the batch approve lands — it stayed open
    // before, unlike the reject/cancel dialogs.
    setApproveOpen(false)
  }

  const rejectSelected = async () => {
    if (!sret) return
    await decideMutation.mutateAsync({
      sretId: sret.id,
      body: {
        decisions: selectedDecidable.map((i) => ({
          item_id: i.id,
          decision: "rejected",
          rejection_reason: rejectReason,
        })),
      },
    })
    setSelectedIds(new Set())
    setRejectReason("")
    setRejectOpen(false)
  }

  const confirmCancel = async () => {
    if (!sret) return
    await cancelMutation.mutateAsync({ sretId: sret.id, cancelReason })
    setCancelReason("")
    setCancelOpen(false)
  }

  // §0.9 — the confirm is disabled until its required reason is filled; name
  // that fixable gate in a tooltip (the pending state is not a fixable gate).
  const rejectBlockReason = !rejectReason.trim()
    ? S.detail.approval.blockedReason
    : null
  const cancelBlockReason = !cancelReason.trim()
    ? S.detail.cancel.blockedReason
    : null

  return {
    detailQuery,
    sret,
    decideMutation,
    cancelMutation,
    patchMutation,
    today,
    // lines + paging
    items,
    visibleItems,
    currentItemsPage,
    setItemsPage,
    totalItemPages,
    // selection + gates
    selectedIds,
    canDecide,
    decidableItems,
    selectedDecidable,
    allDecidableSelected,
    canCancel,
    isCancelled,
    isTerminal,
    hideSelection,
    logisticsEditable,
    isWarehouseUser,
    toggle,
    toggleAllDecidable,
    approveRow,
    rejectRow,
    // dialogs
    approveOpen,
    setApproveOpen,
    rejectOpen,
    setRejectOpen,
    rejectReason,
    setRejectReason,
    rejectBlockReason,
    cancelOpen,
    setCancelOpen,
    cancelReason,
    setCancelReason,
    cancelBlockReason,
    approveSelected,
    rejectSelected,
    confirmCancel,
    // logistics editor
    ...logistics,
  }
}

export type SalesReturnRequestDetailState = ReturnType<
  typeof useSalesReturnRequestDetail
>