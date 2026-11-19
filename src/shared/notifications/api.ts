// Notifications API — `/api/v1/notifications/*`. Cross-module: every
// CRM/IMS/procurement module emits notifications, the popover lives in
// the global header, and the routing helper handles every entity_type.
// Wire shapes mirror `comprint-erp-backend/app/shared/schemas/notification.py`
// and the type enum in `app/modules/notifications/enums.py`.

import { apiClient } from "@/shared/api/client"
import { endpoints } from "@/shared/api/endpoints"
import type { PageParams, PageResponse } from "@/shared/api/pagination"

export type NotificationType =
  | "mention"
  | "task_assigned"
  | "task_reminder"
  | "task_overdue"
  | "task_completed"
  | "lead_stage_changed"
  | "deal_stage_changed"
  | "lead_assigned"
  | "deal_assigned"
  | "purchase_request_approval"
  | "purchase_request_decided"
  | "demo_request_approval"
  | "demo_request_decided"
  | "ims_export_ready"
  | "ims_export_failed"

export interface NotificationWire {
  id: string
  recipient_id: string
  notification_type: NotificationType
  title: string
  description: string
  module: string
  entity_type: string | null
  entity_id: string | null
  // Parent (entity_type/entity_id) = the page the user lands on.
  // Source (source_entity_type/source_entity_id) = the exact row inside
  // that page the notification was about, used for tab selection and
  // scroll-to-and-highlight. Null for parent-level events (stage
  // changes, lead/deal assignments).
  source_entity_type: string | null
  source_entity_id: string | null
  is_read: boolean
  created_at: string
}

// The standard page plus the user's unread count (for the bell badge).
export interface NotificationListResponse extends PageResponse<NotificationWire> {
  unread_count: number
}

export interface FetchNotificationsParams extends PageParams {
  unread_only?: boolean
}

export async function fetchNotifications(
  params: FetchNotificationsParams = {},
): Promise<NotificationListResponse> {
  return apiClient.get<NotificationListResponse>(endpoints.notifications.list, {
    params: {
      unread_only: params.unread_only,
      page: params.page,
      page_size: params.page_size,
    },
  })
}

export async function fetchUnreadCount(): Promise<{ count: number }> {
  return apiClient.get<{ count: number }>(endpoints.notifications.unreadCount)
}

// PATCH /api/v1/notifications/{id}/read — no body, no response data.
export async function markNotificationRead(id: string): Promise<void> {
  return apiClient.patch<void>(endpoints.notifications.read(id))
}

// PATCH /api/v1/notifications/read-all — flips every unread for the
// current user. No body, no response data.
export async function markAllNotificationsRead(): Promise<void> {
  return apiClient.patch<void>(endpoints.notifications.readAll)
}
