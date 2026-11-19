import { Link } from "react-router-dom"
import { AlertTriangle, Ban, CheckCircle2, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/display/StatusBadge"
import { Typography } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

import type { CrmTaskWire } from "../../api"
import type { useTasksList } from "../../hooks/tasks/useTasksList"
import {
  formatDue,
  priorityBadgeVariant,
  statusBadgeVariant,
  statusIcon,
  statusLabel,
} from "./taskListHelpers"
import { TASKS_STRINGS } from "./tasks.strings"

type List = ReturnType<typeof useTasksList>

export function TaskRow({ task, list }: { task: CrmTaskWire; list: List }) {
  const terminal = task.status === "completed" || task.status === "cancelled"
  const completing = list.completeMut.isPending && list.completeMut.variables === task.id
  const cancelling = list.cancelMut.isPending && list.cancelMut.variables === task.id
  const deleting = list.deleteMut.isPending && list.deleteMut.variables === task.id

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5 shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.03)] transition-all hover:-translate-y-px hover:border-primary/20 hover:shadow-[0_4px_12px_-4px_rgb(var(--shadow-rgb)/0.06),0_2px_4px_-2px_rgb(var(--shadow-rgb)/0.04)]",
      )}
    >
      <div className="shrink-0">{statusIcon(task.status)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Typography variant="body-strong" truncate asChild>
            <span>{task.title}</span>
          </Typography>
          {task.is_overdue && (
            <AlertTriangle
              className="size-3.5 shrink-0 text-warning"
              aria-label={TASKS_STRINGS.row.overdueIconLabel}
            />
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{task.assignee_name ?? TASKS_STRINGS.row.unassigned}</span>
          <span>{TASKS_STRINGS.row.due(formatDue(task.due_date))}</span>
          {task.entity_type && task.entity_id && task.entity_name && (
            <Link
              to={`/crm/${task.entity_type === "lead" ? "leads" : "deals"}/${task.entity_id}`}
              className="text-primary hover:underline"
            >
              {task.entity_name}
            </Link>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge variant={priorityBadgeVariant(task.priority)}>
          {task.priority}
        </StatusBadge>
        <StatusBadge variant={statusBadgeVariant(task.status)}>
          {statusLabel(task.status)}
        </StatusBadge>
        {/* Row actions — backend rejects PATCH/complete/cancel on terminal
            rows, so we hide those buttons there. */}
        {!terminal && list.canWrite && (
          <>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => list.setEditingTask(task)}
              aria-label={TASKS_STRINGS.row.editTask}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => list.completeMut.mutate(task.id)}
              disabled={completing}
              aria-label={TASKS_STRINGS.row.completeTask}
            >
              <CheckCircle2 />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => list.cancelMut.mutate(task.id)}
              disabled={cancelling}
              aria-label={TASKS_STRINGS.row.cancelTask}
            >
              <Ban />
            </Button>
          </>
        )}
        {list.canDelete && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => list.deleteMut.mutate(task.id)}
            disabled={deleting}
            aria-label={TASKS_STRINGS.row.deleteTask}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  )
}
