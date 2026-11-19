import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import type { PageParams, PageResponse } from "@/shared/api/pagination"
import type { components } from "@/shared/api/schema.gen"

// An extend that carries new rates is not applied: it waits for a holder of
// `rentals:extend_approve`. Approving replays it verbatim; rejecting moves
// nothing, the end date included.

export type ExtendRequest = components["schemas"]["ExtendRequestResponse"]
export type ExtendLineRate = ExtendRequest["line_rates"][number]
export type ExtendDecision = "approve" | "reject"

export const fetchPendingExtendRequests = ({ page, page_size }: PageParams) =>
  apiClient.get<PageResponse<ExtendRequest>>(endpoints.rentals.extendRequestsPending, {
    params: { page, page_size },
  })

/** `notes` is optional on an approval and required on a rejection. */
export const decideExtendRequest = (id: string, decision: ExtendDecision, notes: string | null) =>
  apiClient.post<ExtendRequest>(endpoints.rentals.extendRequestDecide(id, decision), { notes })
