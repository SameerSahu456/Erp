import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"
import type { components } from "@/shared/api/schema.gen"

// Terminating an order and deleting an invoice wait for approval
// (2026-11-14). Raising one moves nothing; approving carries it out.

export type ActionRequest = components["schemas"]["ActionRequestResponse"]
export type ActionRequestSubject = ActionRequest["subject"]
export type ActionRequestStatus = ActionRequest["status"]

export interface ActionRequestsPage {
  items: ActionRequest[]
  total: number
  page: number
  page_size: number
}

export interface ActionRequestsQuery {
  subject?: ActionRequestSubject
  status?: ActionRequestStatus
  sales_order_id?: string
  rental_invoice_id?: string
  page?: number
  page_size?: number
}

const ROUTE_KIND: Record<ActionRequestSubject, "terminations" | "invoice-deletions"> = {
  terminate: "terminations",
  invoice_delete: "invoice-deletions",
}

export const fetchActionRequests = (params: ActionRequestsQuery = {}) =>
  apiClient.get<ActionRequestsPage>(endpoints.rentals.actionRequests, {
    params: {
      ...params,
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
    },
  })

/** What deciding needs to know about a request — an action-request row or an
 *  early-exit queue row alike. */
export interface DecidableRequest {
  id: string
  subject: ActionRequestSubject
}

/** Approve (optionally waiving a termination's early-exit charge, 2026-11-15)
 *  or reject. `waiveEarlyExit` is sent only on a termination's approval. */
export const decideActionRequest = (
  row: DecidableRequest,
  approve: boolean,
  notes?: string,
  waiveEarlyExit = false,
) =>
  apiClient.post<ActionRequest>(
    endpoints.rentals.actionRequestDecide(ROUTE_KIND[row.subject], row.id, approve ? "approve" : "reject"),
    approve && waiveEarlyExit
      ? { notes: notes || null, waive_early_exit: true }
      : { notes: notes || null },
  )

export const cancelActionRequest = (id: string) =>
  apiClient.post<ActionRequest>(endpoints.rentals.actionRequestCancel(id))

export const requestInvoiceDelete = (invoiceId: string, reason: string) =>
  apiClient.post<ActionRequest>(endpoints.rentals.invoiceDeleteRequest(invoiceId), { reason })
