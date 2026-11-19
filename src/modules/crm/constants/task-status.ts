import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { TaskPriority, TaskStatus } from "../api"

// Domain label maps (Coding-guideline §16.12 bucket 2): the single source for
// how a task `status` / `priority` wire value is shown to the user. Routing
// display through these maps means any future copy change lives in one place
// and can't drift across the list table, the detail section, the filter
// dropdown, and the create/edit form.
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

// StatusBadge tone per task status — consolidated so the list row, the
// embedded section row, and the filter share one mapping.
export const TASK_STATUS_VARIANT: Record<TaskStatus, StatusBadgeVariant> = {
  todo: "neutral",
  in_progress: "info",
  completed: "success",
  cancelled: "error",
}

// StatusBadge tone per task priority — single source across list row and
// section row.
export const TASK_PRIORITY_VARIANT: Record<TaskPriority, StatusBadgeVariant> = {
  Low: "neutral",
  Medium: "info",
  High: "warning",
  Urgent: "error",
}
