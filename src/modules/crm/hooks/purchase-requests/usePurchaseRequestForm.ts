import { useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { useNavigateBack } from "@/hooks/use-navigate-back"
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { deepEqual } from "@/lib/deep-equal"

import { PURCHASE_REQUESTS_STRINGS } from "../../components/purchase-requests/purchase-requests.strings"
import { purchaseRequests } from "../../data/purchase-requests"
import { salesOrders } from "../../data/sales-orders"
import type { PurchaseRequest, PurchaseRequestItem } from "../../types"

export const PR_STATUSES = [
  "Draft",
  "Submitted",
  "Under Review",
  "Pricing Confirmed",
  "Approved",
  "Rejected",
] as const

export const MOCK_OWNERS = ["Amit Patel", "Sneha Desai", "Rahul Verma"] as const

function generateId(): string {
  return `pri-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createEmptyPRItem(): PurchaseRequestItem {
  return {
    id: generateId(),
    item: "",
    description: "",
    category: "",
    qty: 1,
  }
}

function getStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case "Draft": return "neutral"
    case "Submitted": return "info"
    case "Under Review": return "warning"
    case "Pricing Confirmed": return "success"
    case "Approved": return "success"
    case "Rejected": return "error"
    default: return "neutral"
  }
}

// Container logic for the (mock-data) Purchase Request create/edit form:
// header fields, the editable items table, totals, dirty detection, and the
// save/submit flows.
export function usePurchaseRequestForm() {
  const { id: prId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const existingPR = prId ? purchaseRequests.find((pr) => pr.id === prId) : undefined

  // Pre-fill from sales order
  const paramSOId = searchParams.get("salesOrderId") ?? ""
  const linkedSO = paramSOId
    ? salesOrders.find((so) => so.id === paramSOId)
    : existingPR?.salesOrderId
      ? salesOrders.find((so) => so.id === existingPR.salesOrderId)
      : undefined

  const [prNumber] = useState(
    existingPR?.prNumber ?? `PR-2026-${String(purchaseRequests.length + 1).padStart(3, "0")}`
  )
  const [status, setStatus] = useState<PurchaseRequest["status"]>(existingPR?.status ?? "Draft")
  const [requestedBy, setRequestedBy] = useState(existingPR?.requestedBy ?? MOCK_OWNERS[0])
  const [notes, setNotes] = useState(existingPR?.notes ?? "")
  const [items, setItems] = useState<PurchaseRequestItem[]>(
    existingPR?.items ?? [createEmptyPRItem()]
  )

  const backHref = "/crm/purchase-requests"
  const goBack = useNavigateBack(backHref)

  // Initial/current snapshot for dirty detection (mock page, no API).
  const initialValues = {
    status: (existingPR?.status ?? "Draft") as PurchaseRequest["status"],
    requestedBy: existingPR?.requestedBy ?? MOCK_OWNERS[0],
    notes: existingPR?.notes ?? "",
    items: (existingPR?.items ?? []).map((it) => ({
      item: it.item,
      description: it.description,
      category: it.category,
      qty: it.qty,
      estimatedRate: it.estimatedRate,
      confirmedRate: it.confirmedRate,
      availableDate: it.availableDate,
      vendorNotes: it.vendorNotes,
    })),
    itemCount: existingPR?.items?.length ?? 1,
  }
  const currentValues = {
    status,
    requestedBy,
    notes,
    items: items.map((it) => ({
      item: it.item,
      description: it.description,
      category: it.category,
      qty: it.qty,
      estimatedRate: it.estimatedRate,
      confirmedRate: it.confirmedRate,
      availableDate: it.availableDate,
      vendorNotes: it.vendorNotes,
    })),
    itemCount: items.length,
  }
  const isDirty = !deepEqual(currentValues, initialValues)
  const guard = useUnsavedChangesGuard({ isDirty })

  function updateItem(id: string, field: keyof Omit<PurchaseRequestItem, "id">, value: string | number | undefined) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyPRItem()])
  }

  function removeItem(id: string) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function handleSaveDraft() {
    toast.success(PURCHASE_REQUESTS_STRINGS.toast.draftSaved)
    navigate(backHref, { replace: true })
  }

  function handleSubmit() {
    toast.success(PURCHASE_REQUESTS_STRINGS.toast.submitted)
    navigate(backHref, { replace: true })
  }

  function handleCancel() {
    guard.attempt(goBack)
  }

  const totalEstimated = items.reduce((sum, i) => sum + (i.estimatedRate ?? 0) * i.qty, 0)
  const totalConfirmed = items.reduce((sum, i) => sum + (i.confirmedRate ?? 0) * i.qty, 0)

  return {
    existingPR,
    linkedSO,
    prNumber,
    status, setStatus,
    statusVariant: getStatusVariant(status),
    requestedBy, setRequestedBy,
    notes, setNotes,
    items,
    updateItem,
    addItem,
    removeItem,
    totalEstimated,
    totalConfirmed,
    isDirty,
    guard,
    backHref,
    handleSaveDraft,
    handleSubmit,
    handleCancel,
  }
}

export type PurchaseRequestFormController = ReturnType<typeof usePurchaseRequestForm>
