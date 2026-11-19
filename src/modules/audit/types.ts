// Audit-trail types — re-exports from the generated OpenAPI schema.
// Backend source: comprint-erp-backend/app/shared/schemas/audit.py
// Endpoint:       GET /api/v1/audit-trail (app/modules/audit/api/v1/endpoints.py)

import type { components } from "@/shared/api/schema.gen";

export type AuditEntry = components["schemas"]["AuditEntryResponse"];
export type AuditListResponse = components["schemas"]["PaginatedResponse_AuditEntryResponse_"];

export type FetchAuditTrailParams = {
  page?: number;
  page_size?: number;
  resource_type?: string;
  resource_id?: string;
  order?: "newest" | "oldest";
};
