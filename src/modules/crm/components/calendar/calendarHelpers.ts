import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"

import type { MeetingStatus, TaskStatus } from "../../api"

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

// Backend `start_time` / `end_time` arrive as HH:MM:SS — trim to HH:MM.
export const hhmm = (t: string) => t.slice(0, 5)

// Task status is lowercase on the wire; keep human-readable labels.
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const TASK_STATUS_VARIANT: Record<TaskStatus, StatusBadgeVariant> = {
  todo: "neutral",
  in_progress: "info",
  completed: "success",
  cancelled: "error",
}

export const MEETING_STATUS_VARIANT: Record<MeetingStatus, StatusBadgeVariant> = {
  Scheduled: "info",
  Completed: "success",
  Cancelled: "error",
}
