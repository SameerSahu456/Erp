import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import { PAGINATION } from "@/shared/constants"

// ─── Activities (polymorphic — leads / deals / accounts / contacts) ────
//
// Wire shapes mirror `comprint-erp-backend/app/modules/crm/schemas/activity.py`.
// Backend serializes `metadata_` → `metadata` via Field alias; the FE reads
// the aliased name. Backend currently allow-lists `lead`/`deal` only for
// both GET and POST; account/contact return 400 until the allow-list opens
// — the FE still types them so the same component covers all four entities.
//
// RBAC: GET requires `crm:read`; POST (Tier-2 log) requires `crm:manage`.
// Tier-1 system rows (stage_change, account_created, …) come back on GET
// but cannot be created via POST.

export type ActivityEntityType = "lead" | "deal" | "account" | "contact"

// User-loggable activity types (Tier 2). Backend whitelists exactly these
// five on POST (`enums.py:662-666` + `services/activity_service.py`).
// Tier-1 system rows ride through GET with their own `activity_type` codes
// (`stage_change`, `account_created`, …) — those render via fallback in
// the UI but cannot be logged from the FE.
export type ActivityLogType =
  | "call"
  | "email"
  | "whatsapp"
  | "follow_up"
  | "meeting"

export type ActivityTier = "system" | "user"
export type ActivityDirection = "inbound" | "outbound"

export interface ActivityWire {
  id: string
  entity_type: ActivityEntityType
  entity_id: string
  activity_type: string                // Tier-2 enum or Tier-1 system code
  tier: ActivityTier
  title: string
  description: string | null
  outcome: string | null
  direction: ActivityDirection | null
  activity_date: string | null         // YYYY-MM-DD
  metadata: Record<string, unknown> | null
  actor_id: string | null              // null for system events
  created_at: string                   // ISO-8601 UTC
}

export interface ActivityListWire {
  items: ActivityWire[]
  has_more: boolean
  next_cursor: string | null
}

export interface FetchActivitiesParams {
  limit?: number          // backend: 1..200, default 50
  before_id?: string      // cursor — id of the oldest row already loaded
}

export interface LogActivityInput {
  activity_type: ActivityLogType
  title: string
  description?: string
  outcome?: string                     // validated per type at the backend
  direction?: ActivityDirection
  activity_date?: string               // YYYY-MM-DD
  metadata?: Record<string, unknown>
}

// Per-type outcome whitelists mirror the backend's `ACTIVITY_VALID_OUTCOMES`
// in `comprint-erp-backend/app/modules/crm/enums.py` — the service layer
// rejects any outcome not in the set for that `activity_type` (422). The ""
// empty string sentinel is the FE's "no outcome selected" placeholder —
// strip it before sending. Values the FE previously offered that the
// backend rejects are commented out (kept for now, not deleted).
export const ACTIVITY_OUTCOMES: Record<ActivityLogType, readonly string[]> = {
  call: [
    "reached",
    "no_answer",
    "left_voicemail",
    "busy",
    // "voicemail" — backend uses "left_voicemail"; "rescheduled" — not valid
  ],
  email: [
    "sent",
    "replied",
    "no_reply",
    // "bounced" — not backend-valid
  ],
  whatsapp: [
    "sent",
    "replied",
    "no_reply",
    // "delivered", "read" — not backend-valid
  ],
  follow_up: [
    "done",
    "rescheduled",
    "no_response",
    // "completed" — backend uses "done"
  ],
  meeting: [
    "completed",
    "cancelled",
    "no_show",
    // "rescheduled" — not backend-valid
  ],
} as const

export const ACTIVITY_LOG_TYPES: readonly ActivityLogType[] = [
  "call",
  "email",
  "whatsapp",
  "follow_up",
  "meeting",
] as const

export async function fetchEntityActivities(
  entityType: ActivityEntityType,
  entityId: string,
  params: FetchActivitiesParams = {},
): Promise<ActivityListWire> {
  return apiClient.get<ActivityListWire>(
    endpoints.crm.activities(entityType, entityId),
    {
      params: {
        limit: params.limit ?? PAGINATION.DEFAULT_PAGE_SIZE,
        before_id: params.before_id,
      },
    },
  )
}

export async function logEntityActivity(
  entityType: ActivityEntityType,
  entityId: string,
  body: LogActivityInput,
): Promise<ActivityWire> {
  return apiClient.post<ActivityWire>(
    endpoints.crm.activities(entityType, entityId),
    body,
  )
}
