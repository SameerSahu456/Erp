import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"
import type { components } from "@/shared/api/schema.gen"

// Serial swaps and billing adjustments (return-by-count §7, R10, R11).
// The customer returned a unit from one order but meant another: the swap
// re-binds the boxes, and if the wrong order was already billed past the
// return, the excess becomes an adjustment accounts issue as a credit note.

export type RentalUnitSwap = components["schemas"]["RentalUnitSwapResponse"]
export type RentalUnitSwapCreate = components["schemas"]["RentalUnitSwapCreate"]
export type RentalBillingAdjustment = components["schemas"]["RentalBillingAdjustmentResponse"]
export type AdjustmentIssueRequest = components["schemas"]["AdjustmentIssueRequest"]

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface SwapListParams {
  status?: string[]
  account_id?: string
  page?: number
  page_size?: number
}

const paged = (p: SwapListParams): Record<string, unknown> => ({
  status: p.status,
  account_id: p.account_id,
  page: p.page ?? 1,
  page_size: p.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
})

export const fetchSwaps = (params: SwapListParams = {}) =>
  apiClient.get<Page<RentalUnitSwap>>(endpoints.rentals.swaps, { params: paged(params) })

export const fetchSwap = (id: string) => apiClient.get<RentalUnitSwap>(endpoints.rentals.swap(id))

export const proposeSwap = (body: RentalUnitSwapCreate) =>
  apiClient.post<RentalUnitSwap>(endpoints.rentals.swaps, body)

export const decideSwap = (id: string, approve: boolean, notes?: string) =>
  apiClient.post<RentalUnitSwap>(
    approve ? endpoints.rentals.swapApprove(id) : endpoints.rentals.swapReject(id),
    { notes: notes || null },
  )

export const fetchBillingAdjustments = (params: SwapListParams = {}) =>
  apiClient.get<Page<RentalBillingAdjustment>>(endpoints.rentals.billingAdjustments, {
    params: paged(params),
  })

export const fetchBillingAdjustment = (id: string) =>
  apiClient.get<RentalBillingAdjustment>(endpoints.rentals.billingAdjustment(id))

/** Raise the credit note(s) the adjustment asks for. */
export const issueBillingAdjustment = (id: string, body: AdjustmentIssueRequest) =>
  apiClient.post<RentalBillingAdjustment>(endpoints.rentals.billingAdjustmentIssue(id), body)

export const cancelBillingAdjustment = (id: string) =>
  apiClient.post<RentalBillingAdjustment>(endpoints.rentals.billingAdjustmentCancel(id), {})
