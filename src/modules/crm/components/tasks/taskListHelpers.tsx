import { CheckCircle2, Circle, Clock, X } from "lucide-react"

import type { StatusBadgeVariant } from "@/components/common/display/StatusBadge"
import { formatIST_date } from "@shared/lib/date"

import type { TaskPriority, TaskStatus } from "../../api"
import {
  TASK_PRIORITY_VARIANT,
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANT,
} from "../../constants/task-status"
import { TASKS_STRINGS } from "./tasks.strings"

export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: TASK_STATUS_LABELS.todo },
  { value: "in_progress", label: TASK_STATUS_LABELS.in_progress },
  { value: "completed", label: TASK_STATUS_LABELS.completed },
  { value: "cancelled", label: TASK_STATUS_LABELS.cancelled },
]

export const PRIORITY_OPTIONS: TaskPriority[] = ["Low", "Medium", "High", "Urgent"]

export function statusBadgeVariant(status: TaskStatus): StatusBadgeVariant {
  return TASK_STATUS_VARIANT[status]
}

export function statusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status]
}

export function statusIcon(status: TaskStatus) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="size-3.5 text-green-500" />
    case "in_progress":
      return <Clock className="size-3.5 text-blue-500" />
    case "cancelled":
      return <X className="size-3.5 text-red-500" />
    default:
      return <Circle className="size-3.5 text-muted-foreground" />
  }
}

export function priorityBadgeVariant(priority: TaskPriority): StatusBadgeVariant {
  return TASK_PRIORITY_VARIANT[priority]
}

export function formatDue(iso: string | null): string {
  if (!iso) return TASKS_STRINGS.row.noDueDate
  // Due date is date-only (no time is picked), so render the date alone.
  return formatIST_date(iso)
}

export function isTerminal(status: TaskStatus): boolean {
  return status === "completed" || status === "cancelled"
}
