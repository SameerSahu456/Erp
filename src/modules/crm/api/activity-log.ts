// CRM User Activity Log — typed wrapper over GET /api/v1/crm/activity-log.
//
// Per-user (actor) chronological feed aggregating four backend sources
// (crm_activities, audit_log stage/status changes, audit_log general field
// updates, crm_tasks) into one paginated, date-ordered list. Backend contract
// validated against app/modules/crm/schemas/user_activity_log.py + endpoints.py.
//
// Wire types are hand-typed here (mirroring crm/api.ts convention) because
// schema.gen.ts has not yet been regenerated for this endpoint — run
// `pnpm api:gen` once the backend is up to formalize. See
// comprint-erp-docs/modules/foundation/audit/PLAN_user_activity_log_dynamic.md.

import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"

// Audit-derived sources (all carry `audit_id`, produced by the backend's
// `_from_audit_event` — CRUD writes + stage moves): `created` (record creation),
// `field_change` (a field edit), `deleted` (record deletion), `stage_change`
// (from→to). All are folded into the `all` feed. `activity` / `task` / `meeting`
// come from the CRM tables (`crm_activities` / `crm_tasks` / `crm_meetings`).
// `meeting` rows are standalone (no entity_type/entity_id), so they render as
// non-clickable timeline entries. See app/modules/crm/schemas/user_activity_log.py.
export type ActivityLogSource =
  | "activity"
  | "stage_change"
  | "task"
  | "meeting"
  | "field_change"
  | "created"
  | "deleted"

// The backend also supports `"activities"`, but the UI intentionally hides
// that tab (and the legacy "Records" tab has no backend equivalent), so the
// FE only ever sends these three. See comprint-erp-docs/modules/foundation/audit/PLAN_user_activity_log_dynamic.md.
export type ActivityLogTab = "all" | "stage_changes" | "tasks"

export type ActivityLogEntityType =
  | "lead"
  | "deal"
  | "account"
  | "contact"
  | "quote"
  | "sales_order"
  | "material_inquiry"
  | "demo_request"
  | "user"
  | "role"

export interface UserActivityLogItem {
  id: string
  source: ActivityLogSource
  /** audit_log row id for `stage_change` / `field_change`; null otherwise.
   *  Use to deep-link to a specific audit-trail entry. */
  audit_id: string | null
  /** ISO-8601 UTC — rendered in IST by the timeline. */
  occurred_at: string
  title: string
  description: string | null
  icon_type: string
  actor_id: string | null
  actor_name: string | null
  entity_type: ActivityLogEntityType | null
  entity_id: string | null
  entity_label: string | null
  metadata: Record<string, unknown> | null
}

export interface UserActivityLogPage {
  items: UserActivityLogItem[]
  total: number
  page: number
  page_size: number
}

export interface FetchUserActivityLogParams {
  userId: string
  tab?: ActivityLogTab
  fromDate?: string
  toDate?: string
  page?: number
  pageSize?: number
}

export async function fetchUserActivityLog(
  params: FetchUserActivityLogParams,
): Promise<UserActivityLogPage> {
  return apiClient.get<UserActivityLogPage>(endpoints.crm.activityLog, {
    params: {
      user_id: params.userId,
      // Backend default is "all"; omit it so the query string stays clean.
      tab: params.tab && params.tab !== "all" ? params.tab : undefined,
      from_date: params.fromDate || undefined,
      to_date: params.toDate || undefined,
      page: params.page ?? 1,
      page_size: params.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE,
    },
  })
}
