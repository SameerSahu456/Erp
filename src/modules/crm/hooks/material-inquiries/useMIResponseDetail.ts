import { useMemo } from "react"
import { useParams } from "react-router-dom"

import { useMIResponse } from "@modules/procurement"
import { getUserDisplayName, useUser } from "@modules/users"
import { useAllCategories } from "@modules/ims"

import { useMaterialInquiry } from "./useMaterialInquiries"

// Container logic for the MI vendor-response detail page: the response query,
// the parent inquiry query, user-name resolution, and coverage/budget maths.
export function useMIResponseDetail() {
  const { id: miId, responseId } = useParams<{ id: string; responseId: string }>()

  const backHref = miId
    ? `/crm/material-inquiries/${miId}`
    : "/crm/material-inquiries"

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useMIResponse(miId ?? "", responseId)

  // Parent MI — the response wire only carries the response itself.
  const {
    data: mi,
    isLoading: miIsLoading,
    isError: miIsError,
  } = useMaterialInquiry(miId ?? "")

  // The single line item this response answers — joined on enquiry_item_id.
  const item = useMemo(
    () =>
      response && mi
        ? mi.items.find((it) => it.id === response.enquiry_item_id)
        : undefined,
    [response, mi],
  )

  // Resolve responder / PM-actioner / MI-assignee UUIDs to display names.
  const respondedByUser = useUser(response?.responded_by ?? "")
  const pmActionedByUser = useUser(response?.pm_actioned_by ?? "")
  const assignedToUser = useUser(mi?.assigned_to_id ?? "")
  const respondedByName = respondedByUser.data
    ? getUserDisplayName(respondedByUser.data)
    : respondedByUser.isLoading
      ? "Loading…"
      : "Unknown user"
  const pmActionedByName = pmActionedByUser.data
    ? getUserDisplayName(pmActionedByUser.data)
    : pmActionedByUser.isLoading
      ? "Loading…"
      : "Unknown user"
  const assignedToName = assignedToUser.data
    ? getUserDisplayName(assignedToUser.data)
    : assignedToUser.isLoading
      ? "Loading…"
      : "Unknown user"

  // Resolve the inquiry item's category_id to a human-readable name.
  const { data: allCategories } = useAllCategories()
  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of allCategories ?? []) m.set(c.id, c.name)
    return m
  }, [allCategories])

  // ── Coverage maths (response vs the line item it answers) ─────────
  const qtyRequested = item?.qty_requested ?? 0
  const totalCost = response ? response.cost_price * response.qty_available : 0
  const coveragePct =
    response && item && qtyRequested > 0
      ? Math.min(100, Math.round((response.qty_available / qtyRequested) * 100))
      : 0
  const shortfall =
    response && item ? Math.max(0, qtyRequested - response.qty_available) : 0
  const clientBudgetPerUnit = item?.client_budget_per_unit ?? null
  const offeredPerUnit = response ? response.sell_price ?? response.cost_price : 0
  const withinBudget =
    clientBudgetPerUnit != null
      ? offeredPerUnit <= clientBudgetPerUnit
      : undefined
  const budgetDeltaTotal =
    response && clientBudgetPerUnit != null
      ? Math.abs(clientBudgetPerUnit - offeredPerUnit) * response.qty_available
      : 0

  return {
    miId,
    backHref,
    response,
    isLoading,
    isError,
    error,
    mi,
    miIsLoading,
    miIsError,
    item,
    respondedByName,
    pmActionedByName,
    assignedToName,
    categoryNameById,
    qtyRequested,
    totalCost,
    coveragePct,
    shortfall,
    clientBudgetPerUnit,
    offeredPerUnit,
    withinBudget,
    budgetDeltaTotal,
  }
}
