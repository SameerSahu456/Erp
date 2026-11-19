import type { components, operations } from "@shared/api/schema.gen";
import { apiClient } from "@shared/api/client";
import { endpoints } from "@shared/api/endpoints";
import { PAGINATION } from "@/shared/constants";

// Inward exceptions (return-by-count spec §8): every box a rental-return
// batch held instead of booking. Each is resolved one of four ways — it was
// ours after all (link), a mis-scan (void), or it goes back to the customer
// (return, then delivered).

export type InwardException = components["schemas"]["InwardExceptionResponse"];
export type InwardExceptionLinkRequest = components["schemas"]["InwardExceptionLinkRequest"];
export type InwardExceptionReturnRequest = components["schemas"]["InwardExceptionReturnRequest"];

export type InwardExceptionStockRequest = components["schemas"]["InwardExceptionStockRequest"];
export type InwardExceptionVoidRequest = components["schemas"]["InwardExceptionVoidRequest"];
export type InwardExceptionDeliveredRequest = components["schemas"]["InwardExceptionDeliveredRequest"];
export type InwardExceptionsPage = components["schemas"]["PaginatedResponse_InwardExceptionResponse_"];
export type InwardExceptionListParams = NonNullable<
  operations["list_inward_exceptions_api_v1_wms_inward_exceptions_get"]["parameters"]["query"]
>;

export async function fetchInwardExceptions(
  params: InwardExceptionListParams = {},
): Promise<InwardExceptionsPage> {
  return apiClient.get<InwardExceptionsPage>(endpoints.wms.inwardExceptions, {
    params: {
      ...params,
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      overdue: params.overdue || undefined,
    },
  });
}

export async function fetchInwardException(id: string): Promise<InwardException> {
  return apiClient.get<InwardException>(endpoints.wms.inwardException(id));
}

export async function linkInwardException(
  id: string,
  body: InwardExceptionLinkRequest,
): Promise<InwardException> {
  return apiClient.post<InwardException>(endpoints.wms.inwardExceptionLink(id), body);
}

export async function voidInwardException(id: string, notes: string): Promise<InwardException> {
  const body: InwardExceptionVoidRequest = { notes };
  return apiClient.post<InwardException>(endpoints.wms.inwardExceptionVoid(id), body);
}

export async function returnInwardException(
  id: string,
  body: InwardExceptionReturnRequest,
): Promise<InwardException> {
  return apiClient.post<InwardException>(endpoints.wms.inwardExceptionReturn(id), body);
}

export async function markInwardExceptionDelivered(
  id: string,
  deliveredAt?: string,
): Promise<InwardException> {
  const body: InwardExceptionDeliveredRequest = { delivered_at: deliveredAt || null };
  return apiClient.post<InwardException>(endpoints.wms.inwardExceptionDelivered(id), body);
}

/** Make the stock unit a settled rental unit's box never had. */
export async function bringInwardExceptionIntoStock(
  id: string,
  body: InwardExceptionStockRequest,
): Promise<InwardException> {
  return apiClient.post<InwardException>(endpoints.wms.inwardExceptionStock(id), body);
}
