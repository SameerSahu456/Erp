import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"
import type { components } from "@/shared/api/schema.gen"

// Customer deficiencies — the sales recovery queue (return-by-count §9.4).
// The warehouse records what came back missing or broken; sales prices it
// on a charge order, or asks a manager to waive it. A credit (a unit sold
// on a loss charge that came back) gets a proposed amount instead.

export type CustomerDeficiencyWire = components["schemas"]["CustomerDeficiencyResponse"]
export type ChargeOrderLineWire = components["schemas"]["ChargeOrderLine"]
export type SalesOrderWireForCharge = components["schemas"]["SalesOrderResponse"]

export interface CustomerDeficienciesPage {
  items: CustomerDeficiencyWire[]
  total: number
  page: number
  page_size: number
}

export interface FetchDeficienciesParams {
  page?: number
  page_size?: number
  account_id?: string
  status?: string[]
  deficiency_type?: string
}

export async function fetchCustomerDeficiencies(
  params: FetchDeficienciesParams = {},
): Promise<CustomerDeficienciesPage> {
  return apiClient.get<CustomerDeficienciesPage>(endpoints.crm.deficiencies, {
    params: {
      ...params,
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      deficiency_type: params.deficiency_type || undefined,
    },
  })
}

export async function fetchCustomerDeficiency(id: string): Promise<CustomerDeficiencyWire> {
  return apiClient.get<CustomerDeficiencyWire>(endpoints.crm.deficiency(id))
}

/** One draft sales order, one line per deficiency. Never dispatched. */
export async function raiseChargeOrder(lines: ChargeOrderLineWire[]): Promise<SalesOrderWireForCharge> {
  return apiClient.post<SalesOrderWireForCharge>(endpoints.crm.deficiencyChargeOrder, { lines })
}

export async function requestDeficiencyWaiver(
  id: string,
  body: { reason: string; proposed_amount?: string | null },
): Promise<CustomerDeficiencyWire> {
  return apiClient.post<CustomerDeficiencyWire>(endpoints.crm.deficiencyWaiver(id), body)
}

export async function decideDeficiencyWaiver(
  id: string,
  approve: boolean,
  notes?: string,
): Promise<CustomerDeficiencyWire> {
  const url = approve
    ? endpoints.crm.deficiencyWaiverApprove(id)
    : endpoints.crm.deficiencyWaiverReject(id)
  return apiClient.post<CustomerDeficiencyWire>(url, { notes: notes || null })
}

export async function markDeficiencyRecovered(
  id: string,
  notes: string,
): Promise<CustomerDeficiencyWire> {
  return apiClient.post<CustomerDeficiencyWire>(endpoints.crm.deficiencyRecovered(id), { notes })
}
