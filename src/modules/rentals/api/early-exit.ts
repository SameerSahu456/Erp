import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"
import type { components } from "@/shared/api/schema.gen"

// Early exit, waivers and lost devices (return-by-count §10, §11, R17, R18).
// A unit returned before its contracted end owes a % of the remaining rent
// on the next invoice; sales may ask a manager to waive it. A unit the
// customer confirms lost stops billing and becomes a charge.

export type EarlyExitCharge = components["schemas"]["EarlyExitChargeResponse"]
export type WaiverRequest = components["schemas"]["WaiverRequestResponse"]
export type AccountEarlyExitTermsRequest = components["schemas"]["AccountEarlyExitTermsRequest"]
export type RecordLossRequest = components["schemas"]["RecordLossRequest"]

/** One row of Approvals → Early exit: a termination (with its charge and
 *  waiver ask) or a waiver raised on its own (2026-11-15). */
export type EarlyExitQueueRow = components["schemas"]["EarlyExitQueueRow"]

export interface EarlyExitQueuePage {
  items: EarlyExitQueueRow[]
  total: number
  page: number
  page_size: number
}

export const fetchEarlyExitCharges = (salesOrderId: string) =>
  apiClient.get<EarlyExitCharge[]>(endpoints.rentals.salesOrderEarlyExitCharges(salesOrderId))

export const requestEarlyExitWaiver = (chargeId: string, reason: string) =>
  apiClient.post<WaiverRequest>(endpoints.rentals.earlyExitWaiver(chargeId), { reason })

export const requestAccountEarlyExitTerms = (accountId: string, body: AccountEarlyExitTermsRequest) =>
  apiClient.post<WaiverRequest>(endpoints.rentals.accountEarlyExitTerms(accountId), body)

export const fetchEarlyExitQueue = (params: { status?: string[]; page?: number; page_size?: number } = {}) =>
  apiClient.get<EarlyExitQueuePage>(endpoints.rentals.earlyExitQueue, {
    params: {
      status: params.status,
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
    },
  })

export const decideWaiverRequest = (id: string, approve: boolean, notes?: string) =>
  apiClient.post<WaiverRequest>(
    approve ? endpoints.rentals.waiverRequestApprove(id) : endpoints.rentals.waiverRequestReject(id),
    { notes: notes || null },
  )

export const recordDeviceLoss = (deviceId: string, body: RecordLossRequest) =>
  apiClient.post<unknown>(endpoints.rentals.deviceLost(deviceId), body)

export const markDeviceFoundInUse = (deviceId: string, notes: string) =>
  apiClient.post<unknown>(endpoints.rentals.deviceFoundInUse(deviceId), { notes })
