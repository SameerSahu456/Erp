// Thin typed wrapper over GET /api/v1/audit-trail.
// Returns the inner AuditListResponse — the axios response interceptor in
// src/shared/api/client.ts unwraps the ApiResponse envelope before this
// callsite ever sees it. A failed envelope throws ApiError automatically.
//
// Backend contract: comprint-erp-backend/app/modules/audit/api/v1/endpoints.py
// Schema:           components["schemas"]["PaginatedResponse_AuditEntryResponse_"]

import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import { PAGINATION } from "@/shared/constants";

import type { AuditListResponse, FetchAuditTrailParams } from "./types";

export async function fetchAuditTrailPage(
  params: FetchAuditTrailParams = {},
): Promise<AuditListResponse> {
  return apiClient.get<AuditListResponse>(endpoints.audit.trail, {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE,
      resource_type: params.resource_type?.trim() || undefined,
      order: params.order,
      resource_id: params.resource_id?.trim() || undefined,
    },
  });
}
